import type { IView } from '@/interface/IView'
import { BackSide, Camera, Color, FrontSide, LinearFilter, Material, Matrix4, MeshDepthMaterial, NoBlending, OrthographicCamera, RGBADepthPacking, RGBAFormat, Scene, ShaderMaterial, UniformsUtils, Vector2, WebGLMultisampleRenderTarget, WebGLRenderer, WebGLRenderTarget } from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass'
import { View } from './View'
import { edgesVertexShader } from './EdgesShader/vertex.glsl'
import { edgesFragmentShader } from './EdgesShader/fragment.glsl'
import { outLineVertexShader } from './OutLineShader/vertex.glsl'
import { outLineFragmentShader } from './OutLineShader/fragment.glsl'
import { addEdgeVertexShader } from './AddEdgeShader/vertex.glsl'
import { addEdgeFragmentShader } from './AddEdgeShader/fragment.glsl'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
type vec2Type = {
    x: number
    y: number
}

// renderTarget 参数
const pars = {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat
}

export class CadPass extends Pass {
    resolution: Vector2
    transparent: boolean
    colored: boolean
    visibleEdge: boolean
    hiddenEdge: boolean
    // 面深度材质
    meshDepthMaterial!: MeshDepthMaterial
    renderScene!: Scene // 渲染的场景
    renderCamera!: OrthographicCamera // 渲染的相机
    singleBuffer!: WebGLRenderTarget // 存深度图的buffer 在缓存创建一张图片，我们可以把这张图片当成纹理在几何体上使用
    topoBuffer!: WebGLRenderTarget // 存原始topo数据
    tEdgeMaterial!: ShaderMaterial // 边线材质
    backSideMaterial!: ShaderMaterial // 轮廓线材质
    textureMatrix: Matrix4 // 材质变换矩阵
    fsQuad: FullScreenQuad // 全屏渲染
    copyUniforms: any
    materialCopy: any
    oldClearColor: Color
    oldClearAlpha: any
    oldAutoClear: any
    addEdgeMaterial!: ShaderMaterial
    multiBuffer!: WebGLRenderTarget
    // 设备分辨率
    devicePixelRatio!:number
    originBuffer!: WebGLRenderTarget
    visibleCache:Map<number,boolean> = new Map()
    constructor(resolution: vec2Type, transparent: boolean = false, colored: boolean = true, visibleEdge: boolean = true, hiddenEdge: boolean = false) {
        super()
        this.enabled = true
        this.needsSwap = false
        this.devicePixelRatio = window.devicePixelRatio
        this.resolution = resolution ? new Vector2(resolution.x * this.devicePixelRatio, resolution.y * this.devicePixelRatio) : new Vector2(256, 256)
        this.textureMatrix = new Matrix4()
        this.fsQuad = new FullScreenQuad()
        this.oldClearColor = new Color()

        // 渲染的四个参数 默认透明和不可见边关闭
        this.transparent = transparent //false
        this.colored = colored
        this.visibleEdge = visibleEdge
        this.hiddenEdge = hiddenEdge // false

        this.createMaterials()
    }

    // 创建材质
    createMaterials() {
        // 本身线条材质
        this.createEdgeMaterials()
        // 轮廓线材质
        this.createToPoMaterials()
        // 混合材料输出
        this.createOverlayMaterials()
    }

    // 创建线材质
    createEdgeMaterials() {
        // 按灰度绘制的网格材质
        this.meshDepthMaterial = new MeshDepthMaterial({
            side: FrontSide,
            // 解码方式
            depthPacking: RGBADepthPacking,
            // 混合模式
            blending: NoBlending
        })

        // 创建一个buffer 缓存mesh深度图
        this.singleBuffer = new WebGLRenderTarget(this.resolution.x, this.resolution.y, pars)
        this.singleBuffer.stencilBuffer = true

        // 边线材质
        this.tEdgeMaterial = this.getTedgeMaterial()

        // 边线最终输出缓冲
        this.multiBuffer = new WebGLRenderTarget(this.resolution.x, this.resolution.y, pars)
        this.multiBuffer.stencilBuffer = true
        this.multiBuffer.depthBuffer = false
        // this.multiBuffer.samples = 10

        // 加粗边线材质
        this.addEdgeMaterial = this.getAddEdgeMaterial()
        this.addEdgeMaterial.uniforms['texSize'].value.set(this.multiBuffer.width, this.multiBuffer.height)
    }

    // 创建轮廓线材质
    createToPoMaterials() {
        this.topoBuffer = new WebGLRenderTarget(this.resolution.x, this.resolution.y, pars)
        this.topoBuffer.stencilBuffer = true
        this.backSideMaterial = this.getBackSideMaterial()

        // 原始贴图
        this.originBuffer = new WebGLRenderTarget(this.resolution.x, this.resolution.y,pars)
        this.originBuffer.stencilBuffer = true
    }

    // 混合材料最终结果
    createOverlayMaterials() {
        const copyShader = CopyShader
        this.copyUniforms = UniformsUtils.clone(copyShader.uniforms)
        this.copyUniforms['opacity'].value = 1.0
        this.materialCopy = new ShaderMaterial({
            uniforms: this.copyUniforms,
            vertexShader: copyShader.vertexShader,
            fragmentShader: copyShader.fragmentShader,
            blending: NoBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true
        })
    }

    // 将场景中所有物体先渲染一边保存
    renderOrigin(renderer:WebGLRenderer){
        this.renderWithBuffer(renderer, this.originBuffer, null)
    }

    // topo渲染
    renderTopo(renderer: WebGLRenderer) {
        // this.changeVisible('Mesh', true)
        this.renderWithBuffer(renderer, this.topoBuffer, null)
        // this.changeVisible('', false)
    }

    // 轮廓线渲染
    renderBackSide(renderer: WebGLRenderer) {
        if (this.visibleEdge && !this.transparent) {
            const currentSceneBackground = this.renderScene.background
            this.renderScene.background = null
            this.renderScene.overrideMaterial = this.backSideMaterial
            this.changeVisible('Mesh', true) 
            // renderer.setRenderTarget(this.originBuffer)
            // renderer.clear()
            renderer.render(this.renderScene, this.renderCamera)
            // this.renderWithBuffer(renderer,this.originBuffer,this.backSideMaterial)
            // this.changeVisible('', false)
            this.recoverVisible()
            this.renderScene.background = currentSceneBackground
        }
    }

    // 本身线渲染
    renderEdge(renderer: WebGLRenderer) {
        renderer.setClearColor(0x000000, 1)
        renderer.clear()
        this.updateTextureMatrix()
        // 渲染所有mesh
        this.changeVisible('Mesh', true) // 除了mesh其它隐藏
        this.renderWithBuffer(renderer, this.singleBuffer, this.meshDepthMaterial)
        this.changeVisible('', false) //恢复

        //  渲染线条 暂时注释
        this.changeVisible('LineSegments', true)
        this.tEdgeMaterial.uniforms['cameraNearFar'].value.set(this.renderCamera.near, this.renderCamera.far)
        this.tEdgeMaterial.uniforms['depthTexture'].value = this.singleBuffer.texture
        this.tEdgeMaterial.uniforms['textureMatrix'].value = this.textureMatrix

        this.renderWithBuffer(renderer, this.multiBuffer, this.tEdgeMaterial)

        this.addEdgeMaterial.uniforms['topoTexture'].value = this.originBuffer.texture
        this.addEdgeMaterial.uniforms['tEdgeTexture'].value = this.multiBuffer.texture
        this.addEdgeMaterial.uniforms['texSize'].value.set(this.multiBuffer.width, this.multiBuffer.height)

        this.renderWithFs(renderer, this.originBuffer, this.addEdgeMaterial)

        this.changeVisible('', false)
    }

    // 改变图元可见性
    changeVisible(type: string, show: boolean) {
        // console.log(this.renderScene.children)
        // debugger
        // const objs = this.renderScene.children.filter((item) => item.type === 'Mesh' || item.type === 'LineSegments')
        // console.log(objs)
        // debugger
        // objs.forEach((item) => {
        //     if (item.type === type) {
        //         item.visible = show
        //     } else {
        //         item.visible = !show
        //     }
        // })
        const exceptIds:Array<number> = []
        if(type === 'Mesh'){
            this.renderScene.children.forEach(item=>{
                if(item.type === 'plane_helper'){
                    this.visibleCache.set(item.id,item.visible)
                    item.visible = false
                }
            })
        }
    }

    recoverVisible(){
        for(let item of this.visibleCache) {
            const obj = this.renderScene.getObjectById(item[0])
            if(obj){
                obj.visible = item[1]
            }
        }
    }

    // 使用buffer渲染
    renderWithBuffer(renderer: WebGLRenderer, buffer: WebGLRenderTarget | null, material: Material | null) {
        this.renderScene.overrideMaterial = material
        renderer.setRenderTarget(buffer)
        renderer.clear()
        renderer.render(this.renderScene, this.renderCamera)
    }

    // 全屏渲染
    renderWithFs(renderer: WebGLRenderer, buffer: WebGLRenderTarget | null, material: ShaderMaterial) {
        this.fsQuad.material = material
        renderer.setRenderTarget(buffer)
        renderer.clear()
        this.fsQuad.render(renderer)
    }

    // 更新材质的变换矩阵
    updateTextureMatrix() {
        this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0)
        // 相机
        this.textureMatrix.multiply(this.renderCamera.projectionMatrix)
        // 便于重新应用到世界矩阵中
        this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse)
    }

    // 获取线材质
    getTedgeMaterial(): ShaderMaterial {
        return new ShaderMaterial({
            uniforms: {
                cameraNearFar: { value: new Vector2(0.5, 0.5) },
                topoTexture: { value: null },
                textureMatrix: { value: null },
                depthTexture: { value: null },
                param: {
                    value: {
                        x: this.transparent,
                        y: this.colored,
                        z: this.visibleEdge,
                        w: this.hiddenEdge
                    }
                }
            },
            vertexShader: edgesVertexShader,
            fragmentShader: edgesFragmentShader,
            depthWrite: false
        })
    }

    // 获取加粗线材质
    getAddEdgeMaterial(): ShaderMaterial {
        return new ShaderMaterial({
            uniforms: {
                topoTexture: { value: null },
                tEdgeTexture: { value: null },
                texSize: { value: new Vector2(0.5, 0.5) },
                param: { value: { x: this.transparent, y: this.colored, z: this.visibleEdge, w: this.hiddenEdge } }
            },
            vertexShader: addEdgeVertexShader,
            fragmentShader: addEdgeFragmentShader,
            depthTest: false,
            depthWrite: false,
            transparent: true
        })
    }

    // 获取轮廓线材质
    getBackSideMaterial(): ShaderMaterial {
        return new ShaderMaterial({
            uniforms: {
                outlineThickness: { value: 0.003 },
                outlineColor: { value: new Color().fromArray([0.12, 0.12, 0.12]) },
                outlineAlpha: { value: 1.0 }
            },
            vertexShader: outLineVertexShader,
            fragmentShader: outLineFragmentShader,
            side: BackSide,

            // FIXME 测试颜色融合 1029
            depthTest: false,
            depthWrite: false,
            transparent: true
        })
    }

    // 渲染
    render(renderer: WebGLRenderer) {
        // 将场景所有东西渲染一变
        this.setOldData(renderer)
        
        // this.renderBackSide(renderer)
        this.renderOrigin(renderer)
        
        
        // this.renderTopo(renderer)
        
        // this.renderEdge(renderer)
        this.resetOldData(renderer)
    }

    setOldData(renderer: WebGLRenderer) {
        renderer.getClearColor(this.oldClearColor)
        this.oldClearAlpha = renderer.getClearAlpha()
        this.oldAutoClear = renderer.autoClear
        renderer.autoClear = false
        renderer.setClearColor(0xffffff, 1)
        renderer.clear()
    }

    // 输出结果
    resetOldData(renderer: WebGLRenderer) {
        renderer.setClearColor(this.oldClearColor, this.oldClearAlpha)
        renderer.autoClear = this.oldAutoClear
        // renderer.clear()
        this.copyUniforms['tDiffuse'].value = this.originBuffer.texture
        this.renderWithFs(renderer, null, this.materialCopy)
    }

    // 设置场景
    setScene(view: IView) {
        this.renderScene = view.scene
        this.renderCamera = view.camera
    }
}
