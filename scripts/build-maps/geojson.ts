// A Polygon or MultiPolygon in GeoJSON, in longitude and latitude, as the
// sources publish them.
import { Schema } from "effect"

const position = Schema.mutable(Schema.Tuple([Schema.Finite, Schema.Finite]))
const ring = Schema.mutable(Schema.NonEmptyArray(position))
const polygon = Schema.mutable(Schema.NonEmptyArray(ring))

export const geometry = Schema.Union([
  Schema.Struct({ type: Schema.Literal("Polygon"), coordinates: polygon }),
  Schema.Struct({
    type: Schema.Literal("MultiPolygon"),
    coordinates: Schema.mutable(Schema.NonEmptyArray(polygon)),
  }),
])
