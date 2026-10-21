// components/common/Footer/SocialIcon.jsx
import Image from 'next/image'
import * as CustomIcons from '@/assets/icons'

const socialIcons = {
  facebook: CustomIcons.Facebook,
  instagram: CustomIcons.Instagram,
  linkedin: CustomIcons.Linkedin,
  pinterest: CustomIcons.Pinterest,
  reddit: CustomIcons.Reddit,
  stocktwits: CustomIcons.Stocktwits,
  telegram: CustomIcons.Telegram,
  tumblr: CustomIcons.Tumblr,
  x: CustomIcons.X,
}

const SocialIcon = ({ platform, size = 24, className = '' }) => {
  const iconSrc = socialIcons[platform.toLowerCase()]
  
  if (!iconSrc) return null
  
  // Get the actual src string from the imported object
  const src = typeof iconSrc === 'object' ? iconSrc.src : iconSrc
  
  return (
    <img 
      src={src}
      alt={`${platform} icon`}
      className={className}
      // Without this React hoists a <link rel="preload"> for every icon into
      // <head>, ahead of the stylesheet, on every page.
      loading="lazy"
    />
  )
}

export default SocialIcon