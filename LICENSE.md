# Licences

## Code

MIT License

Copyright (c) 2026 Nicolas Toulemont

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Map geometry

The MIT licence covers the code, not the boundaries in `src/data/`. Each sheet keeps the licence of the source it was projected from, and `draw` returns that source in `scene.credits`, which `svg` prints under every map.

- World and regional sheets, and 121 national sheets: Natural Earth, public domain.
- Disputed land moved between countries (see the README's Borders section): Natural Earth's disputed areas, public domain. A national sheet with such land cut out stays under its own source's licence.
- The other 91 national sheets: the publisher named in each module's header and credit. Their licences are CC BY 3.0 IGO (31 sheets), ODbL 1.0 alone or combined with other terms (36), CC BY 4.0 (10, plus Ireland from Tailte Éireann), CC0 (8), public domain (Malta), CC BY-SA 3.0 (Greenland), Open Licence 2.0 (Saint Martin), the Open Government Licence v3.0 (United Kingdom, from the ONS), and the Estonian Land and Spatial Development Board's terms (Estonia), which were never recorded and need checking.

ODbL 1.0 and CC BY-SA 3.0 are share-alike: a database derived from those sheets has to be offered under the same licence. This package has not yet set up how it offers the derived geometry for those sheets.
