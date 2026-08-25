// Markdown formatting utilities — normalize content for different platforms.
// Platforms have different Markdown support levels; this layer keeps the
// core publisher simple by handling format differences here.

/**
 * Strip unsupported Markdown features for short-form platforms.
 * Removes headings, code blocks, images — keeps plain text + links + lists.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')           // headings → text only
    .replace(/```[\s\S]*?```/g, '')         // code blocks → removed
    .replace(/!\[.*?\]\(.*?\)/g, '')        // images → removed
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → link text only
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold → text
    .replace(/\*(.+?)\*/g, '$1')            // italic → text
    .replace(/`([^`]+)`/g, '$1')            // inline code → text
    .trim()
}

/**
 * Split long content into chunks for platforms with character limits.
 * Returns an array of chunks, each under maxChars.
 * Tries to split on sentence/paragraph boundaries when possible.
 */
export function splitByChars(content: string, maxChars: number): string[] {
  if (content.length <= maxChars) return [content]

  const chunks: string[] = []
  let remaining = content

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining.trim())
      break
    }

    // Try to find a good break point: paragraph, then sentence, then hard cut
    let cutPoint = maxChars
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxChars)
    const sentenceBreak = Math.max(
      remaining.lastIndexOf('. ', maxChars),
      remaining.lastIndexOf('! ', maxChars),
      remaining.lastIndexOf('? ', maxChars),
    )

    if (paragraphBreak > maxChars * 0.5) {
      cutPoint = paragraphBreak
    } else if (sentenceBreak > maxChars * 0.5) {
      cutPoint = sentenceBreak + 1
    }

    chunks.push(remaining.slice(0, cutPoint).trim())
    remaining = remaining.slice(cutPoint).trim()
  }

  return chunks
}
