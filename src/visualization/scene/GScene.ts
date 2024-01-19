import { AxesHelper, DirectionalLight, OrthographicCamera, Scene, WebGLRenderer } from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

export class GScene  {
    /**场景*/
    scene:Scene
    /**相机*/
    camera:OrthographicCamera
    /**灯光*/
    light:DirectionalLight
    /**控制器*/
    controls:TrackballControls
    /**渲染器*/
    renderer:WebGLRenderer

    constructor(){
        this.initScene()
        this.initCamera()
        this.initRender()
        this.initControls()
        this.initLight()
        this.animate()
        this.onResize()
        this.initAxis()
    }

    /**
    * canvas画布 这样不知道对不对
    */
    get canvas(){
        return this.renderer.domElement
    }

    initScene(){
        this.scene = new Scene()
    }

    initCamera(){
        const frustumSize = 150
        const aspect = window.innerWidth / window.innerHeight
        this.camera = new OrthographicCamera(-aspect * frustumSize,aspect * frustumSize,frustumSize,-frustumSize,1,1000)
        this.camera.position.set(0,-100,0)
        this.camera.up.set(0,0,1)
        this.scene.add(this.camera)
    }

    initRender(){
        this.renderer = new WebGLRenderer({
            antialias:true
        })
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth,window.innerHeight)
        this.renderer.setClearColor(0xeeeeee,1)
        document.body.appendChild(this.renderer.domElement)
    }

    initControls(){
        this.controls = new TrackballControls(this.camera,this.renderer.domElement)
        this.controls.rotateSpeed = 4.5;
        this.controls.panSpeed = 3.95;
        // this.controls.dynamicDampingFactor = 0.8;
        // this.controls.mouseButtons = {
        //     LEFT:MOUSE.PAN,
        //     // fixme 可能会有问题
        //     MIDDLE:MOUSE.DOLLY,
        //     RIGHT:MOUSE.ROTATE
        // }
    }

    initLight(){
        this.light = new DirectionalLight(0xffffff,0.5)
        this.light.position.set(100,0,100)
        this.scene.add(this.light)
    }

    animate(){
        requestAnimationFrame(this.animate.bind(this))
        if(this.controls) this.controls.update()
        this.renderer.render(this.scene,this.camera)
    }

    onResize(){
        const resizeFun = () =>{
            const frustumSize = 150
            const aspect = window.innerWidth / window.innerHeight
            this.renderer.setSize(window.innerWidth,window.innerHeight)
            this.camera.left = -frustumSize * aspect;
            this.camera.right = frustumSize * aspect;
            this.camera.top = frustumSize;
            this.camera.bottom = -frustumSize;
            this.camera.updateProjectionMatrix();
        }
        window.addEventListener('resize',resizeFun,false)
    }

    initAxis(){
        const axes = new AxesHelper(30)
        this.scene.add(axes)
    }
}
