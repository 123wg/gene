/**
 * @Description: 场景类
 * @Author: wanggang
 * @Date: 2022-10-23 18:20:34
 **/

import type { ISceneSize } from '@/interface/ISceneSize'
import type { IView } from '@/interface/IView'
import { Color, DirectionalLight, MOUSE, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
export class View implements IView {
    scene!: Scene

    camera!: OrthographicCamera

    controls!: OrbitControls

    renderer!: WebGLRenderer

    light!: DirectionalLight

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

    _render(): void {
        if (this.controls) this.controls.update()
        this.renderer.render(this.scene, this.camera)
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
