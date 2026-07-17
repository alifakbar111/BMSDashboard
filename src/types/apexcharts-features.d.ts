// Module declarations for apexcharts feature entry points that don't ship
// with their own type definitions. These are side-effect imports registered
// inside next/dynamic callbacks (see src/components/cards/GaugeCard.tsx) so
// the runtime contract is "import anything → no useful return value".
declare module "apexcharts/radialBar";
declare module "apexcharts/features/annotations";
