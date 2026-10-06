import { resolveImageUrl } from '../../utils/formatters.js'

function ProductImage({ src, alt, className = '' }) {
  const imageUrl = resolveImageUrl(src)

  if (!imageUrl) {
    return (
      <div className={`image-placeholder ${className}`} aria-label={alt}>
        <span aria-hidden="true" />
      </div>
    )
  }

  return <img className={className} src={imageUrl} alt={alt} loading="lazy" />
}

export default ProductImage
