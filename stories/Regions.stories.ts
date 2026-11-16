import type { Meta, StoryObj } from "@storybook/html-vite"

import { draw, type Region, regions } from "../src/index.ts"
import { figure, illustrative } from "./figure.ts"

interface RegionArgs {
  readonly region: Region["id"]
}

// "the Baltic states" → "The Baltic states", for a title.
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// Every region sheet, each shaded with illustrative values for its own
// members, so each story shows the frame, the insets and the countries the
// region holds. Countries drawn but left out of the region show as land.
const meta = {
  title: "Maps/Regions",
  argTypes: { region: { control: false } },
  loaders: [
    async ({ args }) => {
      const index = regions.findIndex((region) => region.id === args.region)
      const region = regions[index]

      return {
        scene: await draw({
          sheet: args.region,
          title: capital(region?.name ?? args.region),
          source: "Illustrative values",
          fill: { kind: "choropleth", values: illustrative(region?.countries ?? [], index) },
        }),
      }
    },
  ],
  render: (_, { loaded }) => figure(loaded["scene"]),
} satisfies Meta<RegionArgs>

export default meta

type Story = StoryObj<RegionArgs>

export const Baltics: Story = { args: { region: "baltics" } }

export const WesternBalkans: Story = { args: { region: "western-balkans" } }

export const SouthCaucasus: Story = { args: { region: "south-caucasus" } }

export const Gulf: Story = { args: { region: "gulf" } }

export const Caribbean: Story = { args: { region: "caribbean" } }

export const CentralAmerica: Story = { args: { region: "central-america" } }

export const Nordics: Story = { args: { region: "nordics" } }

export const WestAfrica: Story = { args: { region: "west-africa" } }

export const CentralAfrica: Story = { args: { region: "central-africa" } }

export const EastAfrica: Story = { args: { region: "east-africa" } }

export const SouthernAfrica: Story = { args: { region: "southern-africa" } }

export const NorthAfrica: Story = { args: { region: "north-africa" } }

export const MiddleEast: Story = { args: { region: "middle-east" } }

export const CentralAsia: Story = { args: { region: "central-asia" } }

export const SouthAsia: Story = { args: { region: "south-asia" } }

export const SoutheastAsia: Story = { args: { region: "southeast-asia" } }

export const EastAsia: Story = { args: { region: "east-asia" } }

export const Australia: Story = { args: { region: "australia" } }

export const Europe: Story = { args: { region: "europe" } }

export const SouthAmerica: Story = { args: { region: "south-america" } }

export const LatinAmerica: Story = { args: { region: "latin-america" } }

export const NorthAmerica: Story = { args: { region: "north-america" } }

export const SubSaharanAfrica: Story = { args: { region: "sub-saharan-africa" } }

export const Africa: Story = { args: { region: "africa" } }

export const NortheastAsia: Story = { args: { region: "northeast-asia" } }

export const PostSoviet: Story = { args: { region: "post-soviet" } }

export const ExtendedEurope: Story = { args: { region: "extended-europe" } }

export const Oceania: Story = { args: { region: "oceania" } }

export const Americas: Story = { args: { region: "americas" } }
