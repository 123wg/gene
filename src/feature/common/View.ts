import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
/**
 * @Description: 场景类
 * @Author: wanggang
 * @Date: 2022-10-23 18:20:34
 **/

import type { ISceneSize } from '@/interface/ISceneSize'
import type { IView } from '@/interface/IView'
import {
    AxesHelper,
    BoxBufferGeometry,
    BoxGeometry,
    BufferGeometry,
    Color,
    ConeBufferGeometry,
    CylinderBufferGeometry,
    DirectionalLight,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    MOUSE,
    OrthographicCamera,
    Plane,
    PlaneBufferGeometry,
    Scene,
    TorusKnotBufferGeometry,
    TorusKnotGeometry,
    Vector3,
    WebGLRenderer
} from 'three'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls'
import { CadPass } from './CadPass'
import { Vector2 } from 'three'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
export class View implements IView {
    scene!: Scene

    camera!: OrthographicCamera

    controls!: OrbitControls

    renderer!: WebGLRenderer

    light!: DirectionalLight
    // FIXME 测试数据量比较大
    // test_mesh: Mesh
    // edge_line: LineSegments

    composer!: EffectComposer // 后期处理管理器
    cadPass!: CadPass
    box_mesh!: Mesh<any, MeshStandardMaterial>
    line_mesh!: LineSegments<EdgesGeometry, LineBasicMaterial>
    po_plane!: Plane

    constructor() {
        this._init()
    }

    get dom(): HTMLElement {
        return document.getElementById('gene-canvas') as HTMLElement
    }

    get size(): ISceneSize {
        const size: ISceneSize = {
            width: this.dom.clientWidth,
            height: this.dom.clientHeight
        }
        return size
    }

    _init(): void {
        this._init_scene()
        this._init_camera()
        this._init_light()
        this._init_render()
        this._render()
        this._init_control()
        this._on_resize()
        this._init_axis()
        // this.create_obj()
        // this.create_clipplan()
        // this.init_composer()
    }

    // 创建测试物体
    create_obj() {
        // 正方体
        const boxGeo = new BoxGeometry(20, 20, 20)
        const boxMaterial = new MeshStandardMaterial({
            color: '#3cc48d',
            side: 2
        })
        this.box_mesh = new Mesh(boxGeo, boxMaterial)
        // this.box_mesh.visible = false
        // this.box_mesh.material.transparent = true
        // this.box_mesh.material.opacity = 0
        // 边框
        const lineMaterial = new LineBasicMaterial({
            color: '#000000'
        })
        const lineGeo = new EdgesGeometry(boxGeo)
        this.line_mesh = new LineSegments(lineGeo, lineMaterial)
        // this.line_mesh.visible = false

        // 坐标轴
        const axis_helper = new AxesHelper(50)

        this.scene.add(this.box_mesh)
        this.scene.add(this.line_mesh)
        this.scene.add(axis_helper)
    }

    // 创建切面
    create_clipplan() {
        // 剖切面
        const plane_normal = new Vector3(0, 0, -1)
        const plane = new Plane(plane_normal, 0)

        // 剖切辅助平面
        const plane_helper_gro = new PlaneBufferGeometry(80, 80)
        const plane_material = new MeshBasicMaterial({
            color: 'pink',
            stencilWrite: true,
            stencilRef: 0,
            stencilFunc: THREE.NotEqualStencilFunc,
            stencilFail: THREE.ReplaceStencilOp,
            stencilZFail: THREE.ReplaceStencilOp,
            stencilZPass: THREE.ReplaceStencilOp
        })
        const plane_helper = new Mesh(plane_helper_gro, plane_material)
        plane_helper.type = 'plane_helper'
        plane_helper.renderOrder = 1.1
        plane_helper.onAfterRender = (renderer) => {
            renderer.clearStencil()
        }
        this.scene.add(plane_helper)

        // 模型开启正面和背面渲染 写入模板缓冲
        if (this.box_mesh.visible) {
            const box_geo = this.box_mesh.geometry
            const stencilGroup = this.createPlaneStencilGroup(box_geo, plane, 1)
            this.scene.add(stencilGroup)
        }

        // 物体添加切面
        this.box_mesh.material.clippingPlanes = [plane]
        this.line_mesh.material.clippingPlanes = [plane]
        this.po_plane = plane
    }

    // 创建切口
    createPlaneStencilGroup(geometry: BufferGeometry, plane: Plane, renderOrder: number) {
        const group = new THREE.Group()
        const baseMat = new THREE.MeshBasicMaterial()
        baseMat.depthWrite = false
        baseMat.depthTest = false
        baseMat.colorWrite = false
        baseMat.stencilWrite = true
        baseMat.stencilFunc = THREE.AlwaysStencilFunc

        // back faces
        const mat0 = baseMat.clone()
        mat0.side = THREE.BackSide
        mat0.clippingPlanes = [plane]
        mat0.stencilFail = THREE.IncrementWrapStencilOp
        mat0.stencilZFail = THREE.IncrementWrapStencilOp
        mat0.stencilZPass = THREE.IncrementWrapStencilOp

        const mesh0 = new Mesh(geometry, mat0)
        mesh0.renderOrder = renderOrder
        group.add(mesh0)

        // front faces
        const mat1 = baseMat.clone()
        mat1.side = THREE.FrontSide
        mat1.clippingPlanes = [plane]
        mat1.stencilFail = THREE.DecrementWrapStencilOp
        mat1.stencilZFail = THREE.DecrementWrapStencilOp
        mat1.stencilZPass = THREE.DecrementWrapStencilOp

        const mesh1 = new Mesh(geometry, mat1)
        mesh1.renderOrder = renderOrder

        group.name = 'plane_group'
        group.add(mesh1)

        return group
    }

    _init_scene(): void {
        this.scene = new Scene()
        // this.scene.background = new Color('hsl(195, 20%, 90%)')
    }

    _init_camera(): void {
        const frustumSize = 150
        const aspect = window.innerWidth / window.innerHeight
        this.camera = new OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 1, 1000)
        this.camera.up.set(0, 0, 1)
        this.camera.position.set(10, -100, 10)
        // this.camera.lookAt(new Vector3(0, 0, 0))
    }

    _init_light(): void {
        this.light = new DirectionalLight(0xffffff)
        this.light.position.set(200, 1500, 3000)
        this.scene.add(this.light)
    }

    _init_control(): void {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true // 开启惯性
        this.controls.dampingFactor = 0.8
        this.controls.mouseButtons = {
            LEFT: 555,
            MIDDLE: THREE.MOUSE.ROTATE,
            RIGHT: THREE.MOUSE.PAN
        }
        this.controls.addEventListener('change', () => {
            const cameraPos = this.camera.position
            this.light.position.set(cameraPos.x, cameraPos.y, cameraPos.z)
        })
    }

    _init_render(): void {
        const { width, height } = this.size
        this.renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
            stencil: true
        })
        this.renderer.localClippingEnabled = true

        this.renderer.setClearColor(0xeeeeee, 1)
        this.renderer.setSize(width, height)
        this.dom.appendChild(this.renderer.domElement)
    }

    // 初始化后处理
    init_composer() {
        this.composer = new EffectComposer(this.renderer)
        const { width, height } = this.size
        this.cadPass = new CadPass(new Vector2(width, height))
        this.composer.addPass(this.cadPass)
        this.cadPass.setScene(this)
    }

    _render(): void {
        if (this.controls) this.controls.update()
        if (this.composer) {
            this.composer.render()
        } else {
            this.renderer.render(this.scene, this.camera)
        }
        requestAnimationFrame(this._render.bind(this))
    }

    _on_resize(): void {
        const resizeFun = () => {
            this.size
            const { width, height } = this.size
            this.renderer.setSize(width, height)
            this.camera.updateProjectionMatrix()
        }
        window.addEventListener('resize', resizeFun, false)
    }

    _init_axis() {
        const axes = new AxesHelper(30)
        this.scene.add(axes)
    }
}
