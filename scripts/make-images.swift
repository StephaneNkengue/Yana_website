// Génère les images de partage du site à partir des ressources de l'app iOS.
//
//   swift scripts/make-images.swift [chemin du repo de l'app]   (défaut : ../Yana)
//
// Produit :
//   assets/og-en.jpg          — aperçu de partage 1200 × 630, anglais
//   assets/og-fr.jpg          — aperçu de partage 1200 × 630, français
//
// Charte « Origine » de l'app (Utils/Theme.swift) : fond gris-vert, encre,
// accent sauge, Manrope. À droite, la vraie capture du fil
// (assets/shots/<langue>-feed.webp, tirée des captures App Store).

import AppKit
import CoreText
import ImageIO
import UniformTypeIdentifiers

let site = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let app = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "../Yana", relativeTo: site)
let fonts = app.appendingPathComponent("Yana/Resources/Fonts")
let assets = site.appendingPathComponent("assets")

for name in ["Manrope-ExtraBold.ttf", "Manrope-Bold.ttf"] {
    CTFontManagerRegisterFontsForURL(fonts.appendingPathComponent(name) as CFURL, .process, nil)
}

func hex(_ v: Int, _ a: CGFloat = 1) -> NSColor {
    NSColor(srgbRed: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: a)
}

func font(_ name: String, _ size: CGFloat) -> NSFont {
    guard let font = NSFont(name: name, size: size) else { fatalError("Police introuvable : \(name) (dans \(fonts.path))") }
    return font
}

func image(_ url: URL) -> CGImage {
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("Image introuvable : \(url.path)") }
    return image
}

func write(_ image: CGImage, to url: URL) {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { fatalError() }
    CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: 0.86] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { fatalError("Écriture impossible : \(url.path)") }
    print("✓ \(url.lastPathComponent)")
}

let icon = image(assets.appendingPathComponent("icon.png"))

func ogImage(lang: String, eyebrow: String, title: String) -> CGImage {
    let w = 1200, h = 630
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)

    // Fond Origine, de haut en bas.
    NSGradient(colors: [hex(0xD3D8D3), hex(0xDADEDA)])!.draw(in: NSRect(x: 0, y: 0, width: w, height: h), angle: -90)

    // La capture du fil dans un cadre de téléphone, à droite, coupée en bas.
    let shot = image(assets.appendingPathComponent("shots/\(lang)-feed.webp"))
    let pw: CGFloat = 330, ph = pw * CGFloat(shot.height) / CGFloat(shot.width) + 20
    let frame = NSRect(x: 1200 - pw - 110, y: 630 - 56 - ph, width: pw + 20, height: ph)
    let shadow = NSShadow()
    shadow.shadowColor = hex(0x1F2623, 0.25); shadow.shadowBlurRadius = 40; shadow.shadowOffset = NSSize(width: 0, height: -16)
    NSGraphicsContext.saveGraphicsState(); shadow.set()
    hex(0x1F2623).setFill(); NSBezierPath(roundedRect: frame, xRadius: 52, yRadius: 52).fill()
    NSGraphicsContext.restoreGraphicsState()
    let screen = frame.insetBy(dx: 10, dy: 10)
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: screen, xRadius: 43, yRadius: 43).addClip()
    ctx.draw(shot, in: screen)
    NSGraphicsContext.restoreGraphicsState()

    // À gauche : l'icône du nuage, le nom, la promesse.
    let left: CGFloat = 80
    NSGraphicsContext.saveGraphicsState()
    let iconRect = NSRect(x: left, y: 430, width: 96, height: 96)
    NSBezierPath(roundedRect: iconRect, xRadius: 22, yRadius: 22).addClip()
    ctx.draw(icon, in: iconRect)
    NSGraphicsContext.restoreGraphicsState()

    NSAttributedString(string: eyebrow.uppercased(), attributes: [
        .font: font("Manrope-Bold", 21), .foregroundColor: hex(0x6B7771), .kern: 3.5,
    ]).draw(at: NSPoint(x: left, y: 372))
    NSAttributedString(string: "Yana", attributes: [.font: font("Manrope-ExtraBold", 104), .foregroundColor: hex(0x1F2623), .kern: -3])
        .draw(at: NSPoint(x: left - 4, y: 230))
    let para = NSMutableParagraphStyle(); para.lineSpacing = 2
    NSAttributedString(string: title, attributes: [.font: font("Manrope-ExtraBold", 50), .foregroundColor: hex(0x3A6A62),
                                                   .paragraphStyle: para, .kern: -1])
        .draw(in: NSRect(x: left, y: 70, width: 560, height: 150))

    NSGraphicsContext.current = nil
    return ctx.makeImage()!
}

write(ogImage(lang: "en", eyebrow: "Daily affirmations & quotes", title: "The right words, at the right time."),
      to: assets.appendingPathComponent("og-en.jpg"))
write(ogImage(lang: "fr", eyebrow: "Affirmations et citations", title: "Les bons mots, au bon moment."),
      to: assets.appendingPathComponent("og-fr.jpg"))
