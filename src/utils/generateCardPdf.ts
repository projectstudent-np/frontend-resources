import { toPng } from "html-to-image"
import { jsPDF } from "jspdf"

/**
 * Captures a DOM element as PNG and generates a downloadable PDF.
 * Works consistently on both desktop and mobile.
 */
export async function generateCardPdf(element: HTMLElement, fileName: string) {
  // If the element lives inside an offscreen container, temporarily bring it
  // into the viewport so the browser paints images / QR codes correctly.
  const offscreen = element.closest(
    ".student-card-offscreen",
  ) as HTMLElement | null
  const savedStyle = offscreen?.getAttribute("style") ?? ""
  if (offscreen) {
    // Bring on-screen with full opacity so toPng can capture rendered content.
    // z-index:-9999 keeps it behind all visible UI.
    offscreen.style.cssText =
      "position:fixed;left:0;top:0;z-index:-9999;pointer-events:none;"
    // Wait for browser to paint images / QR codes
    await new Promise((r) => setTimeout(r, 100))
  }

  try {
    const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 3 })

    // Load image to get natural dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    const imgW = img.naturalWidth
    const imgH = img.naturalHeight

    // Create PDF with same aspect ratio as the captured image
    // Use mm units; fit to A4 width (210mm) with proportional height
    const pdfWidth = 210
    const pdfHeight = (imgH / imgW) * pdfWidth

    const orientation = pdfHeight > pdfWidth ? "portrait" : "landscape"
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    })

    pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(fileName)
  } finally {
    // Restore offscreen positioning
    if (offscreen) {
      offscreen.style.cssText = savedStyle
    }
  }
}
