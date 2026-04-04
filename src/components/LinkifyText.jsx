import { useNavigate } from 'react-router-dom'

const URL_REGEX = /(https?:\/\/[^\s]+)/g
const URL_TEST = /^https?:\/\/[^\s]+$/

export default function LinkifyText({ text, className }) {
  const navigate = useNavigate()
  const parts = text.split(URL_REGEX)

  function handleClick(e, url) {
    // Check if it's an internal link (our app)
    try {
      const linkUrl = new URL(url)
      const currentHost = window.location.host
      if (linkUrl.host === currentHost) {
        e.preventDefault()
        navigate(linkUrl.pathname)
      }
    } catch {}
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_TEST.test(part) ? (
          <a
            key={i}
            href={part}
            onClick={(e) => handleClick(e, part)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}
