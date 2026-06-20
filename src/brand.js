export const brand = {
  big: "Big",
  bunny: "Bunny",
  homeBake: "HomeBake",
};

export function getBrandAriaLabel() {
  return `${brand.big}${brand.bunny} ${brand.homeBake}`;
}

export function renderBrandLockup() {
  return `
    <h1 class="wordmark" aria-label="${getBrandAriaLabel()}">
      <span class="brand-big">B</span><span class="brand-bunny">ig${brand.bunny}</span>
      <span class="brand-home">${brand.homeBake}</span>
    </h1>
  `;
}
