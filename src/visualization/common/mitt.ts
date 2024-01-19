import mitt from "mitt"

export type MEventsLike = {
    initCanvas:()=>void
}
export const mEvents = mitt<MEventsLike>()
