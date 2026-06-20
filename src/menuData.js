export const categories = [
  { id: "tubes", label: "Tubes" },
  { id: "cookies", label: "Cookies" },
  { id: "tteok", label: "Tteok" },
];

export const menuItems = [
  {
    id: "brownie-tube",
    name: "Brownie Tube",
    category: "tubes",
    description: "Rich brownie bites packed in a tube, good for sharing.",
    shape: "cup",
    color: "#4b2419",
    accent: "#b98257",
    photo: "./products/brownie-tube.webp",
    photoAlt: "Brownie bites packed in paper cups",
    photos: [
      {
        src: "./products/brownie-tube.webp",
        alt: "Brownie bites packed in paper cups",
      },
      {
        src: "./products/brownie-tube-2.webp",
        alt: "Brownie bites with almond topping in paper cups",
      },
    ],
    sizes: [
      {
        label: "Tube",
        pieces: "15-20 pcs",
        diameterCm: 6,
        heightCm: 16,
        price: 4.5,
      },
    ],
  },
  {
    id: "banana-bread",
    name: "Choco Chip / Almond Banana Bread",
    category: "tubes",
    description: "Soft banana bread with choco chip or almond topping.",
    shape: "box",
    color: "#c88d4c",
    accent: "#5a3422",
    photo: "./products/banana-bread.webp",
    photoAlt: "Banana bread with chocolate chips and almond topping",
    photos: [
      {
        src: "./products/banana-bread.webp",
        alt: "Banana bread with chocolate chips and almond topping in a box",
      },
      {
        src: "./products/banana-bread-2.webp",
        alt: "Banana bread slices with chocolate chips and almonds",
      },
    ],
    sizes: [
      {
        label: "Mini tube",
        diameterCm: 5,
        heightCm: 11,
        price: 2,
      },
      {
        label: "Box",
        diameterCm: 12,
        heightCm: 5,
        price: 2.75,
      },
    ],
  },
  {
    id: "chocolate-cookie",
    name: "Chocolate Cookie",
    category: "cookies",
    description: "Chocolate cookie sold per piece.",
    shape: "cookie",
    color: "#7a3f2a",
    accent: "#2d1710",
    photo: "./products/chocolate-cookie.webp",
    photoAlt: "Chocolate cookies with soft cracked tops",
    photos: [
      {
        src: "./products/chocolate-cookie.webp",
        alt: "Chocolate cookies with soft cracked tops",
      },
      {
        src: "./products/chocolate-cookie-2.webp",
        alt: "Broken chocolate cookies showing a soft center",
      },
    ],
    sizes: [
      {
        label: "1 pc",
        diameterCm: 7,
        heightCm: 1.2,
        price: 0.5,
      },
      {
        label: "6 pcs",
        diameterCm: 16,
        heightCm: 4,
        price: 3,
      },
    ],
  },
  {
    id: "matcha-cookie",
    name: "Matcha Cookie",
    category: "cookies",
    description: "Matcha cookie sold per piece.",
    shape: "cookie",
    color: "#85a857",
    accent: "#31461f",
    photo: "./products/matcha-cookie.webp",
    photoAlt: "Matcha cookie with white chocolate chips",
    photos: [
      {
        src: "./products/matcha-cookie.webp",
        alt: "Matcha cookie with white chocolate chips",
      },
      {
        src: "./products/matcha-cookie-2.webp",
        alt: "Broken matcha cookie showing soft green center",
      },
    ],
    sizes: [
      {
        label: "1 pc",
        diameterCm: 7,
        heightCm: 1.2,
        price: 0.5,
      },
      {
        label: "6 pcs",
        diameterCm: 16,
        heightCm: 4,
        price: 3,
      },
    ],
  },
  {
    id: "red-velvet-cookie",
    name: "Red Velvet Cookie",
    category: "cookies",
    description: "Red velvet cookie sold per piece.",
    shape: "cookie",
    color: "#a72f3d",
    accent: "#fff1d7",
    photo: "./products/red-velvet-cookie.webp",
    photoAlt: "Red velvet cookie with white chocolate chips",
    photos: [
      {
        src: "./products/red-velvet-cookie.webp",
        alt: "Red velvet cookie with white chocolate chips",
      },
      {
        src: "./products/red-velvet-cookie-2.webp",
        alt: "Broken red velvet cookie showing soft center",
      },
    ],
    sizes: [
      {
        label: "1 pc",
        diameterCm: 7,
        heightCm: 1.2,
        price: 0.5,
      },
      {
        label: "6 pcs",
        diameterCm: 16,
        heightCm: 4,
        price: 3,
      },
    ],
  },
  {
    id: "butter-tteok",
    name: "Butter Tteok",
    category: "tteok",
    description: "Soft butter tteok, packed as 6 pieces.",
    shape: "box",
    color: "#f0c979",
    accent: "#fff3c8",
    photo: "./products/butter-tteok.webp",
    photoAlt: "Butter tteok pieces in a bakery tray",
    photos: [
      {
        src: "./products/butter-tteok.webp",
        alt: "Butter tteok pieces in a bakery tray",
      },
      {
        src: "./products/butter-tteok-2.webp",
        alt: "Close-up of butter tteok pieces",
      },
    ],
    sizes: [
      {
        label: "6 pieces",
        pieces: "6 pcs",
        diameterCm: 14,
        heightCm: 4,
        price: 3.5,
      },
    ],
  },
];
