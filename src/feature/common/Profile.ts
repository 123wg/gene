import type { IView } from '@/interface/IView'
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshStandardMaterial, Plane, PlaneGeometry, PlaneHelper, Raycaster, Vector3, type Intersection } from 'three'
import * as THREE from 'three'
import { ANCHOR_MODE, ControlsManager, EVENTS } from 'three-freeform-controls'
import type Controls from 'three-freeform-controls/dist/types/controls'

export class Profile {
    view: IView
    
    planeMesh: Mesh //用来看的平面
    controls: Controls
    controlsManager: ControlsManager
    plane: Plane = new Plane() //剖切平面
    planeHelper: PlaneHelper // 剖切平面辅助面

    selectNormal: Vector3 = new Vector3(0, 0, 1) // 初始法向
    selectDistance: number = 0 // 初始距离

    planeWidth: number = 40
    planeHeight: number = 40
    constructor(view: IView) {
        this.view = view
        this.init()
    }

    init() {
        // 初始化一些测试模型
        this.init_model()
        // 监听鼠标点击事件
        this.bindClickEvent()
    }

    // 初始化加载模型
    init_model() {
        const vertices = new Float32Array([-5, 5, 5, -5, -5, 5, 5, 5, 5, 5, -5, 5])
        const index = new Uint16Array([0, 1, 2, 1, 3, 2])
        const bufferAttribute = new BufferAttribute(vertices, 3)
        const indexAttribute = new BufferAttribute(index, 1)
        const bufferGeometry = new BufferGeometry()
        bufferGeometry.attributes.position = bufferAttribute
        bufferGeometry.index = indexAttribute
        bufferGeometry.computeVertexNormals()
        const material = this.getMeshmaterial('#09C7F7')
        const mesh = new Mesh(bufferGeometry, material)
        mesh.type = 'test_model'
        this.view.scene.add(mesh)

        for (let i = 1; i < 6; i += 1) {
            const matrix = new Matrix4()
            const angle = (Math.PI / 3) * i
            matrix.makeRotationY(angle)
            const tmpGeometry = bufferGeometry.clone()
            tmpGeometry.applyMatrix4(matrix)
            const tmpMesh = new Mesh(tmpGeometry, material)
            tmpMesh.updateMatrixWorld()
            tmpMesh.type = 'test_model'
            this.view.scene.add(tmpMesh)
        }
    }

    // 创建mesh和控制器
    create_planeMesh() {
        // 可见的mesh
        const planeGeo = new PlaneGeometry(this.planeWidth, this.planeHeight)
        const material = this.getMeshmaterial('#ffff33')
        this.planeMesh = new Mesh(planeGeo, material)
        this.view.scene.add(this.planeMesh)

        // 控制器
        this.controlsManager = new ControlsManager(this.view.camera, this.view.dom)
        this.view.scene.add(this.controlsManager)
        this.controls = this.controlsManager.anchor(this.planeMesh, {
            mode: ANCHOR_MODE.INHERIT,
            hideOtherControlsInstancesOnDrag: false,
            showHelperPlane: true
        })

        // 绑定监听事件
        this.bindEvent()
    }

    // 创建切面和切面辅助面
    create_plane() {
        //FIXME  剖切面 重新设置距离
        this.plane = new Plane(this.selectNormal, 0)
        this.planeHelper = new PlaneHelper(this.plane, 60, 0xff0000)
        this.view.scene.add(this.planeHelper)
    }

    // 绑定点击事件
    bindClickEvent() {
        // 所有拾取的物体
        const selectObjs = this.view.scene.children.filter((item) => item.type === 'test_model')
        console.log(selectObjs)
        this.view.dom.addEventListener('click', (event: MouseEvent) => {
            const mouse = { x: 0, y: 0 }
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
            const raycaster = new Raycaster()
            raycaster.setFromCamera(mouse, this.view.camera)
            const intersects = raycaster.intersectObjects(selectObjs)
            if (intersects.length) {
                const selObj: Intersection = intersects[0]
                // 根据选中的信息 创建
            }
        })
    }

    // 绑定控制轴事件
    bindEvent() {
        this.controlsManager.listen(EVENTS.DRAG_START, (planeMesh, handleName) => {
            console.log(handleName)
        })
    }

    getMeshmaterial(color: string): MeshStandardMaterial {
        return new MeshStandardMaterial({
            color,
            side: THREE.DoubleSide
        })
    }
}
