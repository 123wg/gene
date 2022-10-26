import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
/**
 * @Description: 场景类
 * @Author: wanggang
 * @Date: 2022-10-23 18:20:34
 **/

import type { ISceneSize } from '@/interface/ISceneSize'
import type { IView } from '@/interface/IView'
import { BoxGeometry, Color, DirectionalLight, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, MOUSE, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CadPass } from './CadPass'
import { Vector2 } from 'three'
export class View implements IView {
    scene!: Scene

    camera!: OrthographicCamera

    controls!: OrbitControls

    renderer!: WebGLRenderer

    light!: DirectionalLight
    test_mesh: Mesh
    edge_line: LineSegments

    composer: EffectComposer // 后期处理管理器
    cadPass: CadPass

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
        this.create_mesh()
        this.init_composer()
    }

    // 创建mesh
    create_mesh() {
        const box = new BoxGeometry(20, 20, 20)
        const material = new MeshStandardMaterial({
            color: '#0fffa0',
            side: 2
        })
        this.test_mesh = new Mesh(box, material)
        this.scene.add(this.test_mesh)

        // 添加边缘线
        const edge = new EdgesGeometry(box)
        const edge_material = new LineBasicMaterial({
            color: '#000000'
        })
        this.edge_line = new LineSegments(edge, edge_material)
        this.scene.add(this.edge_line)

        console.log(this.edge_line)
    }

    _init_scene(): void {
        this.scene = new Scene()
        this.scene.background = new Color('hsl(195, 20%, 90%)')
    }

    _init_camera(): void {
        const frustumSize = 150
        const aspect = window.innerWidth / window.innerHeight
        this.camera = new OrthographicCamera((frustumSize * aspect) / -2, (frustumSize * aspect) / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000)
        this.camera.up.set(0, 1, 0)
        this.camera.position.set(10, 10, 100)
        this.camera.lookAt(new Vector3(0, 0, 0))
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
            MIDDLE: MOUSE.ROTATE,
            RIGHT: MOUSE.PAN
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

        this.renderer.setClearColor(0xeeeeee)
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
}
