export const threadVertexShader = `
    varing vec2 VuV;
    varing vec3 vPosition;

    void main() {
        vUv = uv;
        vPosition = position;
        vec3 mvPosition = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`
