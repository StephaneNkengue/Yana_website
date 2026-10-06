// Génère les images du site à partir des ressources de l'app iOS.
//
//   swift scripts/make-images.swift [chemin du repo de l'app]   (défaut : ../Yana)
//
// Produit :
//   assets/figure.avif        — la figure, compressée (le PNG reste en secours)
//   assets/og-en.jpg          — aperçu de partage 1200 × 630, anglais
//   assets/og-fr.jpg          — aperçu de partage 1200 × 630, français

import AppKit
import CoreText
import ImageIO
import UniformTypeIdentifiers

let site = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let app = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "../Yana", relativeTo: site)
let fonts = app.appendingPathComponent("Yana/Resources/Fonts")
let assets = site.appendingPathComponent("assets")

for name in ["Newsreader-Display.ttf", "Newsreader-TextItalic.ttf"] {
    CTFontManagerRegisterFontsForURL(fonts.appendingPathComponent(name) as CFURL, .process, nil)
}

func hex(_ v: Int, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: a)
}

func write(_ image: CGImage, to url: URL, type: UTType, quality: CGFloat) {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, type.identifier as CFString, 1, nil) else {
        fatalError("Format non pris en charge : \(type.identifier)")
    }
    CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { fatalError("Écriture impossible : \(url.path)") }
    print("✓ \(url.lastPathComponent)")
}

// ---------- Figure en AVIF ----------
guard let src = CGImageSourceCreateWithURL(assets.appendingPathComponent("figure.png") as CFURL, nil),
      let figure = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("assets/figure.png introuvable") }
write(figure, to: assets.appendingPathComponent("figure.avif"), type: UTType("public.avif")!, quality: 0.62)

// ---------- Images de partage ----------
func ogImage(title: String, eyebrow: String) -> CGImage {
    let w = 1200, h = 630
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)

    // Fond : le dégradé lavande de l'app.
    let bg = NSGradient(colors: [hex(0xEEE8F8), hex(0xF5F0FA), hex(0xF1EAF6)])!
    bg.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: -90)
    let glow = NSGradient(colors: [hex(0xB89BC8, 0.45), hex(0xB89BC8, 0)])!
    glow.draw(fromCenter: NSPoint(x: 900, y: 330), radius: 0, toCenter: NSPoint(x: 900, y: 330), radius: 420, options: [])

    // Figure à droite.
    let fh: CGFloat = 560, fw = fh * CGFloat(figure.width) / CGFloat(figure.height)
    ctx.draw(figure, in: CGRect(x: 1200 - fw - 40, y: (630 - fh) / 2, width: fw, height: fh))

    // Textes à gauche.
    let left: CGFloat = 80
    let eyebrowAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 22, weight: .semibold),
        .foregroundColor: hex(0x8D7F97),
        .kern: 4.5,
    ]
    NSAttributedString(string: eyebrow.uppercased(), attributes: eyebrowAttrs).draw(at: NSPoint(x: left, y: 448))

    let logo = NSFont(name: "Newsreader-TextItalic", size: 112) ?? NSFont.systemFont(ofSize: 112)
    NSAttributedString(string: "Yana", attributes: [.font: logo, .foregroundColor: hex(0x1E1B22)])
        .draw(at: NSPoint(x: left - 4, y: 300))

    let titleFont = NSFont(name: "Newsreader-Display", size: 56) ?? NSFont.systemFont(ofSize: 56)
    let para = NSMutableParagraphStyle(); para.lineSpacing = 2
    NSAttributedString(string: title, attributes: [.font: titleFont, .foregroundColor: hex(0x7D5670), .paragraphStyle: para])
        .draw(in: NSRect(x: left, y: 120, width: 560, height: 160))

    NSGraphicsContext.current = nil
    return ctx.makeImage()!
}

write(ogImage(title: "Build the life you want.", eyebrow: "Daily manifestation"),
      to: assets.appendingPathComponent("og-en.jpg"), type: .jpeg, quality: 0.86)
write(ogImage(title: "Construis la vie que tu veux.", eyebrow: "Manifestation quotidienne"),
      to: assets.appendingPathComponent("og-fr.jpg"), type: .jpeg, quality: 0.86)
