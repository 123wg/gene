import { BoxGeometry, BufferGeometry, Color, Mesh, MeshBasicMaterial, MeshPhongMaterial, Scene, Vector2, WebGLRenderTarget } from "three"
import { GScene } from "../scene/GScene"
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils'
import * as THREE from 'three'

/**
* 测试gpu拾取的场景
*/
export class Scene1 extends GScene {
    /**记录当前鼠标位置*/
    pickPoint:Vector2
    /**pick的scene*/
    pickScene:Scene
    /**pick的渲染目标*/
    pickTexture:WebGLRenderTarget
    /**拾取的材质*/
    pickMaterial:MeshBasicMaterial
    /**用于索引拾取mesh的数据结构*/
    meshMap:Record<string,Mesh> = {}


    /**所有的mesh*/
    boxMeshes:Array<Mesh> = []
    constructor(){
        super()
        this.initObjs()
        this.initPick()
    }

    /**初始化供拾取的物体*/
    initObjs(){
        for(let i = 0; i < 2000; i+=1) {
            const boxGeo = new BoxGeometry(10,10,10)
            boxGeo.translate(i * 10,0,0)
            const boxMat = new MeshPhongMaterial({
                color:new Color().setHex(Math.random()*0xffffff)
            })
            const boxMesh = new Mesh(boxGeo,boxMat)
            this.boxMeshes.push(boxMesh)
        }
        this.scene.add(...this.boxMeshes)
    }

    /**
    * 初始化gpu拾取的一些东西
    */
    initPick(){
        this.pickScene = new Scene()
        this.pickTexture = new WebGLRenderTarget(1,1)
        this.pickMaterial = new MeshBasicMaterial({
            vertexColors:true,
            side:THREE.DoubleSide
        })
        const color=  new Color()
        this.pickPoint = new Vector2()
        const meshes:Mesh[] = this.boxMeshes

        const geos = meshes.map((item,index)=>{
            const newGeo = item.geometry
            this.meshMap[index] = meshes[index]
            // console.log(this.meshMap);
            this.applyVertexColor(newGeo,color.setHex(index))
            return newGeo
        })
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geos)
        const pickMesh = new Mesh(mergedGeo,this.pickMaterial)

        // console.log(pickMesh);
        this.pickScene.add(pickMesh)

        // // 监听鼠标移动事件
        this.canvas.addEventListener('mousemove',(event)=>{
            this.pickPoint.x = event.clientX
            this.pickPoint.y = event.clientY
            this.pick()
        })
    }

    /**
    * 设置顶点颜色
    */
    applyVertexColor(geo:BufferGeometry,color:Color){
        const position = geo.attributes.position
        const colors:Array<number> = []
        for(let i=0; i < position.count; i ++) {
            colors.push(color.r,color.g,color.b)
        }
        geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
    }

    /**
    * 具体的拾取方法
    */
    pick(){
        const dpr = window.devicePixelRatio
        // 用于设置摄像机的视口偏移。通过设置视口偏移，你可以在渲染时只渲染相机视口的一部分
        this.camera.setViewOffset(this.canvas.width,this.canvas.height,
            Math.floor(this.pickPoint.x * dpr), Math.floor(this.pickPoint.y * dpr),1,1)

        /**设置渲染目标*/
        this.renderer.setRenderTarget(this.pickTexture)
        /**渲染一次*/
        this.renderer.render(this.pickScene,this.camera)
        /**清除视口偏移*/
        this.camera.clearViewOffset()

        /**创建缓冲区数据读取颜色*/
        const pixelBuffer = new Uint8Array(4)

        /**读取颜色*/
        this.renderer.readRenderTargetPixels(this.pickTexture,0,0,1,1,pixelBuffer)

        /**像素数据解码出id 和meshMap比较即可*/
        const id  = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
        if(this.meshMap[id]) {
            console.log('选中的mesh为');
            console.log(this.meshMap[id]);
        }else {
            console.log('未选中');
        }
    }
}

new Scene1()
