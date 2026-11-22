import { type Issue, parse, type Path, type Spec } from "./spec.ts"

const isRecord = (input: unknown): input is Readonly<Record<string, unknown>> =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const child = (input: unknown, key: string | number): unknown =>
  Array.isArray(input) ? input[Number(key)] : isRecord(input) ? input[String(key)] : undefined

const has = (input: unknown, key: string | number) =>
  Array.isArray(input)
    ? Number(key) < input.length
    : isRecord(input) && Object.hasOwn(input, String(key))

// The input without the node at `path`, which must exist.
const without = (input: unknown, path: Path): unknown => {
  const [key, ...rest] = path

  if (key === undefined) return undefined

  if (Array.isArray(input))
    return rest.length === 0
      ? input.filter((_, index) => index !== key)
      : input.map((each, index) => (index === key ? without(each, rest) : each))

  if (!isRecord(input)) return input

  return rest.length === 0
    ? Object.fromEntries(Object.entries(input).filter(([at]) => at !== key))
    : { ...input, [key]: without(input[key], rest) }
}

// The node an issue condemns: an unknown key itself, a node `parse` refused,
// or, when a required node is missing, the object that lacks it.
const culprit = (input: unknown, issue: Issue): Path => {
  const path = issue.kind === "UnknownKey" ? [...issue.path, issue.key] : issue.path
  let node = input

  for (const [index, key] of path.entries()) {
    if (!has(node, key)) return path.slice(0, index)

    node = child(node, key)
  }

  return path
}

// The path to the value a stream writes last: the last key of each object
// and the last item of each array, down to a leaf.
const last = (input: unknown): Path => {
  if (Array.isArray(input))
    return input.length === 0 ? [] : [input.length - 1, ...last(input.at(-1))]

  if (!isRecord(input)) return []

  const key = Object.keys(input).at(-1)

  return key === undefined ? [] : [key, ...last(input[key])]
}

// Reads a spec from a stream cut short: the JSON a model has written so far,
// its open brackets closed, as structured-output and tool-call streams yield
// it. It never fails. The number a stream ends on may still gain digits, so
// it waits for the next chunk. Anything `parse` would refuse, such as a code
// half written or a pair still missing its value, is left out until it
// parses. No id is a prefix of another, so a code cut short never passes for
// a different one. Draw each chunk with `partial`, and the finished input
// with `parse`: on a finished input `partial` would still hold back the last
// number.
export const partial = (input: unknown): Spec => {
  const end = last(input)
  const leaf = end.reduce<unknown>((node, key) => child(node, key), input)
  let rest = end.length > 0 && typeof leaf === "number" ? without(input, end) : input

  for (;;) {
    const parsed = parse(rest)

    if (parsed.ok) return parsed.spec

    const [first] = parsed.issues
    const path = first === undefined ? [] : culprit(rest, first)

    if (path.length === 0) return {}

    rest = without(rest, path)
  }
}
