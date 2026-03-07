import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"

/**
 * Captures a DOM element as PNG and places it centred on an A4 page.
 * Forces a fixed render width so mobile and desktop produce the same result.
 * Uses blob download on mobile to trigger a real save dialog.
 */
export async function generateCardPdf(element: HTMLElement, fileName: string) {
  // If the element lives inside an offscreen container, temporarily bring it
  // into the viewport so the browser paints images / QR codes correctly.
  const offscreen = element.closest(
    ".student-card-offscreen",
  ) as HTMLElement | null
  const savedOffscreenStyle = offscreen?.getAttribute("style") ?? ""
  if (offscreen) {
    offscreen.style.cssText =
      "position:fixed;left:0;top:0;z-index:-9999;pointer-events:none;"
  }

  // Detect card type
  const isDuo = element.classList.contains("student-card-duo")
  const isPhysicalPdf = element.classList.contains("physical-pdf-page")
  const isDigitalPdf = element.classList.contains("digital-pdf-page")

  // Force a consistent render width regardless of viewport (mobile vs desktop).
  const renderWidth = isPhysicalPdf ? 1100 : isDuo ? 1100 : 560
  const savedElementStyle = element.getAttribute("style") ?? ""
  element.style.width = `${renderWidth}px`
  element.style.maxWidth = "none"
  element.style.minWidth = "0"

  // Wait for browser to repaint with forced width
  await new Promise((r) => setTimeout(r, 150))

  try {
    const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 3 })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    const imgW = img.naturalWidth
    const imgH = img.naturalHeight

    // Always A4 portrait — the card content is scaled to fit inside
    const pageW = 210 // mm
    const pageH = 297

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const margin = 20 // mm
    const maxW = pageW - margin * 2
    const maxH = pageH - margin * 2

    const ratio = imgW / imgH
    let drawW = maxW
    let drawH = drawW / ratio

    if (drawH > maxH) {
      drawH = maxH
      drawW = drawH * ratio
    }

    // Position at the top for PDF pages with headers, centre for bare cards
    const x = (pageW - drawW) / 2
    const y = isDigitalPdf || isPhysicalPdf ? margin : (pageH - drawH) / 2

    pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH)

    // Download: use blob approach on mobile for real save dialog
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobile) {
      const blob = pdf.output("blob")
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = fileName
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      }, 1000)
    } else {
      pdf.save(fileName)
    }
  } finally {
    // Restore original styles
    element.style.cssText = savedElementStyle
    if (offscreen) {
      offscreen.style.cssText = savedOffscreenStyle
    }
  }
}
