import type { IView } from '@/interface/IView'
import { BackSide, Camera, Color, FrontSide, LinearFilter, Material, Matrix4, MeshDepthMaterial, NoBlending, OrthographicCamera, RGBADepthPacking, RGBAFormat, Scene, ShaderMaterial, UniformsUtils, Vector2, WebGLMultisampleRenderTarget, WebGLRenderer, WebGLRenderTarget } from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass'
import { View } from './View'
import { edgesVertexShader } from './EdgesShader/vertex.glsl'
import { edgesFragmentShader } from './EdgesShader/fragment.glsl'
import { outLineVertexShader } from './OutLineShader/vertex.glsl'
import { outLineFragmentShader } from './OutLineShader/fragment.glsl'
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
    meshDepthMaterial: MeshDepthMaterial

    renderScene: Scene // 渲染的场景
    renderCamera: OrthographicCamera // 渲染的相机
    singleBuffer: WebGLRenderTarget // 存深度图的buffer 在缓存创建一张图片，我们可以把这张图片当成纹理在几何体上使用
    topoBuffer: WebGLRenderTarget // 存原始topo数据
    tEdgeMaterial: ShaderMaterial // 边线材质
    backSideMaterial: ShaderMaterial // 轮廓线材质
    textureMatrix: Matrix4 // 材质变换矩阵
    fsQuad: FullScreenQuad // 全屏渲染
    copyUniforms: any
    materialCopy: any
    oldClearColor: Color
    oldClearAlpha: any
    oldAutoClear: any
    constructor(resolution: vec2Type, transparent: boolean = false, colored: boolean = true, visibleEdge: boolean = true, hiddenEdge: boolean = false) {
        super()
        this.enabled = true
        this.needsSwap = false
        this.resolution = resolution ? new Vector2(resolution.x, resolution.y) : new Vector2(256, 256)
        this.textureMatrix = new Matrix4()
        this.fsQuad = new FullScreenQuad(null)
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

        // 边线材质
        this.tEdgeMaterial = this.getTedgeMaterial()
    }

    // 创建轮廓线材质
    createToPoMaterials() {
        this.topoBuffer = new WebGLRenderTarget(this.resolution.x, this.resolution.y, pars)
        this.backSideMaterial = this.getBackSideMaterial()
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

    // topo渲染
    renderTopo(renderer: WebGLRenderer) {
        this.renderWithBuffer(renderer, this.topoBuffer)
    }

    // 轮廓线渲染
    renderBackSide(renderer: WebGLRenderer) {
        if (this.visibleEdge && !this.transparent) {
            const currentSceneBackground = this.renderScene.background
            this.renderScene.background = null
            this.renderScene.overrideMaterial = this.backSideMaterial
            this.changeVisible('Mesh', true)
            renderer.render(this.renderScene, this.renderCamera)
            this.changeVisible('', false)
            this.renderScene.background = currentSceneBackground
        }
    }

    // 本身线渲染
    renderEdge(renderer: WebGLRenderer) {
        renderer.setClearColor(0x000000, 1)
        this.updateTextureMatrix()
        // 渲染所有mesh
        this.changeVisible('Mesh', true) // 除了mesh其它隐藏
        this.renderWithBuffer(renderer, this.singleBuffer, this.meshDepthMaterial)
        this.changeVisible('', false) //恢复

        // FIXME 渲染线条 暂时注释
        this.changeVisible('LineSegments', true)
        this.tEdgeMaterial.uniforms['cameraNearFar'].value.set(this.renderCamera.near, this.renderCamera.far)
        this.tEdgeMaterial.uniforms['topoTexture'].value = this.topoBuffer.texture
        this.tEdgeMaterial.uniforms['depthTexture'].value = this.singleBuffer.texture
        this.tEdgeMaterial.uniforms['textureMatrix'].value = this.textureMatrix
        // FIXME 这个材质需要修改
        this.renderWithFs(renderer, this.topoBuffer, this.tEdgeMaterial)

        this.changeVisible('', false)
    }

    // 改变图元可见性
    changeVisible(type: string, show: boolean) {
        const objs = this.renderScene.children
        objs.forEach((item) => {
            if (item.type === type) {
                item.visible = show
            } else {
                item.visible = !show
            }
        })
    }

    // 使用buffer渲染
    renderWithBuffer(renderer: WebGLRenderer, buffer: WebGLRenderTarget, material?: Material) {
        material && (this.renderScene.overrideMaterial = material)
        // FIXME 暂时注释
        renderer.setRenderTarget(buffer)
        renderer.clear()
        renderer.render(this.renderScene, this.renderCamera)
    }

    // 全屏渲染
    renderWithFs(renderer: WebGLRenderer, buffer: WebGLRenderTarget, material: ShaderMaterial) {
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
            side: BackSide
        })
    }

    // 渲染
    render(renderer: WebGLRenderer) {
        this.setOldData(renderer)
        this.renderTopo(renderer)
        // this.renderBackSide(renderer)
        this.renderEdge(renderer)
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
        this.copyUniforms['tDiffuse'].value = this.topoBuffer.texture
        this.renderWithFs(renderer, null, this.materialCopy)
    }

    // 设置场景
    setScene(view: IView) {
        this.renderScene = view.scene
        this.renderCamera = view.camera
    }
}
