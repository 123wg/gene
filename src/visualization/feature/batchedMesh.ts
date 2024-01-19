import { BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from "three";
import { GScene } from "../scene/GScene";

/**
* batchedMesh加载大模型使用案例
*/
export class GScene1 extends GScene {
    constructor(){
        super()
        this.addBox()
    }

    addBox(){
        for(let i = 0; i < 1000; i+=1) {
            const boxGeo = new BoxGeometry(10,10,10)
            boxGeo.translate(i,0,0)
            const boxMaterial = new MeshBasicMaterial({
                color:'green'
            })
            const boxMesh = new Mesh(boxGeo,boxMaterial)
            this.scene.add(boxMesh)

            const lineGeo = new EdgesGeometry(boxGeo)
            const lineMaterial = new LineBasicMaterial({
                color:'black'
            })
            const lineMesh = new LineSegments(lineGeo,lineMaterial)
            this.scene.add(lineMesh)
        }
    }
}


new GScene1()
