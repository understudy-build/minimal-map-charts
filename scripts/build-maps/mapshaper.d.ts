// The parts of mapshaper's internals scripts/build-maps/simplify.ts calls. mapshaper
// ships no types and does not promise these as public API, so package.json
// pins its exact version.
declare module "mapshaper" {
  interface Intersection {
    readonly x: number
    readonly y: number
    // Vertex indices of the two crossing segments.
    readonly a: readonly [number, number]
    readonly b: readonly [number, number]
  }

  interface Arcs {
    getVertexData(): {
      readonly xx: Float64Array
      readonly yy: Float64Array
      readonly zz: Float64Array
      readonly nn: Uint32Array
      readonly ii: Uint32Array
    }
    getShapeIter(path: ReadonlyArray<number>): {
      readonly x: number
      readonly y: number
      hasNext(): boolean
    }
    setRetainedInterval(interval: number): void
  }

  interface Dataset {
    readonly arcs: Arcs
    readonly layers: ReadonlyArray<{
      readonly shapes: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>> | null>
    }>
  }

  const mapshaper: {
    readonly internal: {
      importContent(
        input: { readonly json: { readonly content: string } },
        options: { readonly no_repair: boolean },
      ): Dataset
      simplifyPaths(
        arcs: Arcs,
        options: {
          readonly method: "dp"
          readonly spherical: boolean
          readonly weighting: number
        },
      ): void
      findSegmentIntersections(arcs: Arcs, options: object): ReadonlyArray<Intersection>
      repairIntersections(arcs: Arcs, intersections: ReadonlyArray<Intersection>): void
    }
  }

  export default mapshaper
}
