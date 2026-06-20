const roundToTwo = (value) => Math.round(value * 100) / 100;

export function getPrimaryDimension(size) {
  if (size.diameterCm) return size.diameterCm;
  if (size.heightCm) return size.heightCm;
  if (size.volumeMl) return Math.cbrt(size.volumeMl);
  return 1;
}

export function getScaleForSize(sizes, selectedSize) {
  const base = Math.min(...sizes.map(getPrimaryDimension));
  return roundToTwo(getPrimaryDimension(selectedSize) / base);
}

export function formatSizeLabel(size) {
  const pieces = size.pieces ? `${size.pieces} · ` : "";

  if (size.diameterCm && size.heightCm) {
    return `${pieces}${size.diameterCm} cm x ${size.heightCm} cm`;
  }

  if (size.diameterCm) {
    return `${pieces}${size.diameterCm} cm wide`;
  }

  if (size.volumeMl) {
    return `${pieces}${size.volumeMl} ml`;
  }

  if (size.heightCm) {
    return `${pieces}${size.heightCm} cm tall`;
  }

  return size.pieces ?? "Size info";
}

export function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}
