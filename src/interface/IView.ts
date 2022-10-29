import type { DirectionalLight, OrthographicCamera, Scene, WebGLRenderer } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { ISceneSize } from './ISceneSize'
export interface IView {
    po_plane: any
    /**场景*/ 
    scene: Scene

    /**相机*/
    camera: OrthographicCamera

    /**控制器*/
    controls: OrbitControls

    /**渲染器*/
    renderer: WebGLRenderer

    /**全局光照*/
    light: DirectionalLight

    /**绑定的dom元素*/
    get dom(): HTMLElement

    /**场景大小*/
    get size(): ISceneSize

    /**初始化*/
    _init(): void

    /**创建场景*/
    _init_scene(): void

    /**创建相机*/
    _init_camera(): void

    /**创建灯光*/
    _init_light(): void

    /**创建控制器*/
    _init_control(): void

    /**创建渲染器*/
    _init_render(): void

    /**渲染方法*/
    _render(): void

    /**处理窗口大小改变*/
    _on_resize(): void
}
