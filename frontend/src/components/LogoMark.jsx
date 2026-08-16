import '../styles/LogoMark.css'

const LogoMark = ({ size, src, alt }) => {
  const s = size || 40

  // If an image source is provided (e.g. a school or DepEd logo),
  // render it instead of the built-in SVG mark.
  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Logo'}
        width={s}
        height={s}
        className="logo-mark-img"
      />
    )
  }

  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1a3a5c" />
      <rect x="8"  y="8"  width="10" height="10" rx="2" fill="#2563eb" />
      <rect x="22" y="8"  width="10" height="10" rx="2" fill="#60a5fa" />
      <rect x="8"  y="22" width="10" height="10" rx="2" fill="#93c5fd" />
      <rect x="22" y="22" width="10" height="10" rx="2" fill="#2563eb" />
    </svg>
  )
}

export default LogoMark
