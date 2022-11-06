import type { IView } from '@/interface/IView'
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Plane, PlaneGeometry, PlaneHelper, Quaternion, Raycaster, Vector3, type Intersection } from 'three'
import * as THREE from 'three'
import { ANCHOR_MODE, ControlsManager, EVENTS } from 'three-freeform-controls'
import type Controls from 'three-freeform-controls/dist/types/controls'
import * as FreeformControls from 'three-freeform-controls'
export class Profile {
    view: IView

    planeMesh: Mesh //用来看的平面
    controls: Controls
    controlsManager: ControlsManager
    plane: Plane = new Plane() //剖切平面
    planeHelper: PlaneHelper // 剖切平面辅助面

    selectNormal: Vector3 = new Vector3(0, 0, 1) // 初始法向
    selectDistance: number = 0 // 初始距离
    // 初始点
    selPoint: Vector3 = new Vector3()

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
                // 根据选中的信息 初始化法向和距离
                this.selectNormal = selObj.face!.normal.clone().normalize()
                // 取三个点构成平面 求距离
                // this.selectDistance = selObj.distance
                const selMesh = selObj.object as Mesh
                const face = selObj.face!
                const posAttr = selMesh.geometry.getAttribute('position') as BufferAttribute
                const point1 = this.getPointFromArr(face.a, posAttr)
                const point2 = this.getPointFromArr(face.b, posAttr)
                const point3 = this.getPointFromArr(face.c, posAttr)
                const tmpPlane = new Plane()
                tmpPlane.setFromCoplanarPoints(point1, point2, point3)
                this.selectDistance = tmpPlane.constant
                this.selPoint = selObj.point

                //创建切面和切面辅助面
                this.create_plane()

                // 创建控制器和mesh
                this.create_planeMesh()
            }
        })
    }

    // 创建mesh和控制器
    create_planeMesh() {
        // 可见的mesh
        const planeGeo = new PlaneGeometry(this.planeWidth, this.planeHeight)
        const material = this.getMeshmaterial('#ffff33')
        this.planeMesh = new Mesh(planeGeo, material)

        // 设置初始位置
        this.planeMesh.position.copy(this.selPoint)

        // 计算矩阵变换
        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), this.selectNormal)
        this.planeMesh.applyQuaternion(quaternion)

        this.planeMesh.updateMatrixWorld()

        this.view.scene.add(this.planeMesh)

        // 控制器
        this.controlsManager = new ControlsManager(this.view.camera, this.view.dom)
        this.view.scene.add(this.controlsManager)
        this.controls = this.controlsManager.anchor(this.planeMesh, {
            mode: ANCHOR_MODE.INHERIT,
            hideOtherHandlesOnDrag: false
            // showHelperPlane: true
        })

        // 绑定监听事件
        this.bindEvent()
    }

    // 创建切面和切面辅助面
    create_plane() {
        //FIXME  剖切面 重新设置距离
        this.plane = new Plane(this.selectNormal, this.selectDistance)
        this.planeHelper = new PlaneHelper(this.plane, 60, 0xff0000)
        this.view.scene.add(this.planeHelper)
    }

    // 绑定控制轴事件
    bindEvent() {
        this.controlsManager.listen(EVENTS.DRAG_START, (planeMesh, handleName) => {
            // @ts-ignore
            this.controls.mode = FreeformControls.ANCHOR_MODE.INHERIT
            // 判断当前正向轴是哪个
            // 和即将拖拽的不相符 计算旋转矩阵 将mesh 转一下 plane恢复后重新使用mesh的矩阵
            const curHandleName = this.getCurHandleName()
            console.log('当前轴');
            console.log(curHandleName);
            // const meshMatrixWorld = this.planeMesh.matrixWorld
            const xMatrix = new Matrix4().makeRotationY(Math.PI / 2) // z-x
            const yMatrix = new Matrix4().makeRotationX(Math.PI / 2) // z-y
            // const zMatrix = new Matrix4().makeRotationZ(0) // z-z
            const xyzHandle = ['xpt_handle','xnt_handle','ypt_handle','ynt_handle','zpt_handle','znt_handle',]
            if(xyzHandle.includes(handleName) && (!handleName.includes(curHandleName))) {
                // @ts-ignore
                this.controls.mode = FreeformControls.ANCHOR_MODE.FIXED
                if(curHandleName === 'x') {
                    if(handleName.includes('y')) {
                        const cMatrix = yMatrix.clone().multiply(xMatrix.clone().invert())
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                    if(handleName.includes('z')) {
                        const cMatrix = xMatrix.clone().invert()
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                }
                if(curHandleName === 'y') {
                    if(handleName.includes('x')) {
                        const cMatrix = xMatrix.clone().multiply(yMatrix.clone().invert())
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                    if(handleName.includes('z')) {
                        const cMatrix = yMatrix.clone().invert()
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                }
                if(curHandleName === 'z') {
                    if(handleName.includes('x')) {
                        const cMatrix = xMatrix
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                    if(handleName.includes('y')) {
                        const cMatrix = yMatrix
                        this.planeMesh.applyMatrix4(cMatrix)
                        this.transformPlaneFromMesh()
                    }
                }
            }
        })

        this.controlsManager.listen(EVENTS.DRAG, (planeMesh, handleName) => {
            // console.log('移动中');
            // console.log(handleName);
            this.switchAxis((planeMesh as Mesh),handleName)
        })

        this.controlsManager.listen(EVENTS.DRAG_STOP, (planeMesh, handleName) => {
            // console.log('移动结束')
            // console.log(this.planeMesh.matrixWorld);
            this.switchAxis((planeMesh as Mesh),handleName)
        })
    }

    // 选择轴
    switchAxis(planeMesh:Mesh,handleName:string) {
        // 在mesh 上取三点 计算距离 移动
        const distance = this.getPlaneConstant()
        switch (handleName) {
        case 'xpt_handle':
            this.plane.constant = -distance
            break;
        case 'xnt_handle':
            this.plane.constant = -distance
            break;
        case 'ypt_handle':
            this.plane.constant = -distance
            break;
        case 'ynt_handle':
            this.plane.constant = -distance
            break;
        case 'zpt_handle':
            this.plane.constant = -distance
            break;
        case 'znt_handle':
            this.plane.constant = -distance
            break;

        case 'xr_handle':
        case 'yr_handle':
        case 'zr_handle':
        case 'er_handle':
            this.plane.constant = 0
            this.plane.normal = new Vector3(0,0,1)
            this.plane.applyMatrix4(planeMesh?.matrixWorld!)
            break;
        }
    }

    // 获取当前朝向轴
    getCurHandleName(){
        let curHandleName = 'z'
        const xyNormalMatrix = new Matrix3().getNormalMatrix(
            this.controls.pickPlaneXY.matrixWorld)
        const yzNormalMatrix = new Matrix3().getNormalMatrix(
            this.controls.pickPlaneYZ.matrixWorld)
        const zxNormalMatrix= new Matrix3().getNormalMatrix(
            this.controls.pickPlaneZX.matrixWorld)
        const xyNormal= new Vector3(0,0,1).applyNormalMatrix(
            xyNormalMatrix)
        const yzNormal = new Vector3(0,0,1).applyNormalMatrix(
            yzNormalMatrix)
        const zxNormal=new Vector3(0,0,1).applyNormalMatrix(
            zxNormalMatrix)
        const planeNormal = this.plane.normal.clone()
        console.log(Math.abs(planeNormal.dot(xyNormal)));
        if(Math.abs(planeNormal.dot(xyNormal)) > 0.95) {
            curHandleName = 'z'
        }
        console.log(Math.abs(planeNormal.dot(yzNormal)));
        if(Math.abs(planeNormal.dot(yzNormal)) > 0.95) {
            curHandleName = 'x'
        }
        console.log(Math.abs(planeNormal.dot(zxNormal)));
        if(Math.abs(planeNormal.dot(zxNormal)) > 0.95) {
            curHandleName = 'y'
        }
        return curHandleName
    }


    // 给一个matrix 平面的normal使用这个matrix
    transformPlaneFromMesh(){
        this.planeMesh.updateMatrixWorld()
        this.plane.constant = 0
        this.plane.normal = new Vector3(0,0,1)
        this.plane.applyMatrix4(this.planeMesh.matrixWorld)
    }


    // 计算原点到mesh的距离
    getPlaneConstant(){
        this.planeMesh.updateMatrixWorld()
        const tmpGeo = this.planeMesh.geometry.clone().applyMatrix4(this.planeMesh.matrixWorld)
        const bufferAttribu = tmpGeo.getAttribute('position') as BufferAttribute
        const point1 = this.getPointFromArr(0, bufferAttribu)
        const point2 = this.getPointFromArr(1, bufferAttribu)
        const point3 = this.getPointFromArr(2, bufferAttribu)
        const tmpPlane = new Plane().setFromCoplanarPoints(point1,point2,point3)
        const distance = tmpPlane.constant
        return distance
    }

    // 从数组中获取点
    getPointFromArr(index: number, attr: BufferAttribute): Vector3 {
        const point0 = attr.getX(index)
        const point1 = attr.getY(index)
        const point2 = attr.getZ(index)
        return new Vector3(point0, point1, point2)
    }

    getMeshmaterial(color: string): MeshStandardMaterial {
        return new MeshStandardMaterial({
            color,
            side: THREE.DoubleSide
        })
    }
}
