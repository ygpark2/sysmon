import Foundation
import CoreGraphics
import CoreText

let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "docs/aws-platform-architecture.pdf"
let pageW: CGFloat = 595
let pageH: CGFloat = 842
let margin: CGFloat = 42

guard let url = URL(fileURLWithPath: output) as CFURL? else { fatalError("Invalid output path") }
var box = CGRect(x: 0, y: 0, width: pageW, height: pageH)
guard let pdf = CGContext(url, mediaBox: &box, nil) else { fatalError("Cannot create PDF") }

let fontName = "AppleGothic" as CFString
let bodyFont = CTFontCreateWithName(fontName, 10, nil)
let smallFont = CTFontCreateWithName(fontName, 8, nil)
let headingFont = CTFontCreateWithName(fontName, 18, nil)
let titleFont = CTFontCreateWithName(fontName, 28, nil)
let monoFont = CTFontCreateWithName("Menlo" as CFString, 8, nil)

let navy = CGColor(red: 0.08, green: 0.24, blue: 0.45, alpha: 1)
let blue = CGColor(red: 0.22, green: 0.52, blue: 0.78, alpha: 1)
let paleBlue = CGColor(red: 0.90, green: 0.95, blue: 0.99, alpha: 1)
let orange = CGColor(red: 0.90, green: 0.40, blue: 0.06, alpha: 1)
let paleOrange = CGColor(red: 1.0, green: 0.95, blue: 0.87, alpha: 1)
let purple = CGColor(red: 0.42, green: 0.16, blue: 0.55, alpha: 1)
let palePurple = CGColor(red: 0.95, green: 0.90, blue: 0.97, alpha: 1)
let gray = CGColor(gray: 0.38, alpha: 1)
let lightGray = CGColor(gray: 0.92, alpha: 1)

func text(_ value: String, at point: CGPoint, font: CTFont = bodyFont, color: CGColor = .black) {
    let attrs: [NSAttributedString.Key: Any] = [kCTFontAttributeName as NSAttributedString.Key: font, kCTForegroundColorAttributeName as NSAttributedString.Key: color]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: value, attributes: attrs))
    pdf.textPosition = point
    CTLineDraw(line, pdf)
}

func lines(_ values: [String], at x: CGFloat, y: CGFloat, leading: CGFloat = 15, font: CTFont = bodyFont, color: CGColor = .black) {
    for (i, value) in values.enumerated() { text(value, at: CGPoint(x: x, y: y - CGFloat(i) * leading), font: font, color: color) }
}

func rect(_ r: CGRect, fill: CGColor, stroke: CGColor? = nil, radius: CGFloat = 8) {
    pdf.setFillColor(fill); pdf.setStrokeColor(stroke ?? fill); pdf.setLineWidth(1)
    pdf.addPath(CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil))
    pdf.drawPath(using: stroke == nil ? CGPathDrawingMode.fill : CGPathDrawingMode.fillStroke)
}

func line(_ a: CGPoint, _ b: CGPoint, color: CGColor = gray, width: CGFloat = 1, dashed: Bool = false) {
    pdf.setStrokeColor(color); pdf.setLineWidth(width)
    pdf.setLineDash(phase: 0, lengths: dashed ? [4, 3] : [])
    pdf.move(to: a); pdf.addLine(to: b); pdf.strokePath(); pdf.setLineDash(phase: 0, lengths: [])
}

func arrow(_ a: CGPoint, _ b: CGPoint, label: String? = nil, color: CGColor = gray, dashed: Bool = false) {
    line(a, b, color: color, width: 1, dashed: dashed)
    let angle = atan2(b.y - a.y, b.x - a.x)
    let size: CGFloat = 5
    let p1 = CGPoint(x: b.x - size * cos(angle - .pi / 6), y: b.y - size * sin(angle - .pi / 6))
    let p2 = CGPoint(x: b.x - size * cos(angle + .pi / 6), y: b.y - size * sin(angle + .pi / 6))
    pdf.setFillColor(color); pdf.move(to: b); pdf.addLine(to: p1); pdf.addLine(to: p2); pdf.closePath(); pdf.fillPath()
    if let label { text(label, at: CGPoint(x: (a.x + b.x) / 2 - CGFloat(label.count) * 2.1, y: (a.y + b.y) / 2 + 5), font: smallFont, color: color) }
}

func header(_ title: String, page: Int) {
    text("AOBS STACK  /  AWS PLATFORM ARCHITECTURE", at: CGPoint(x: margin, y: pageH - 27), font: smallFont, color: blue)
    text(title, at: CGPoint(x: margin, y: pageH - 62), font: headingFont, color: navy)
    line(CGPoint(x: margin, y: pageH - 72), CGPoint(x: pageW - margin, y: pageH - 72), color: lightGray)
    text("sysmon · Docker Swarm observability", at: CGPoint(x: margin, y: 22), font: smallFont, color: gray)
    text("\(page)", at: CGPoint(x: pageW - margin - 8, y: 22), font: smallFont, color: gray)
}

func bullet(_ value: String, at y: CGFloat, x: CGFloat = margin, color: CGColor = .black) {
    pdf.setFillColor(blue); pdf.fillEllipse(in: CGRect(x: x, y: y - 2, width: 4, height: 4))
    text(value, at: CGPoint(x: x + 12, y: y - 5), font: bodyFont, color: color)
}

func box(_ title: String, _ subtitle: String, at r: CGRect, fill: CGColor, stroke: CGColor = blue) {
    rect(r, fill: fill, stroke: stroke)
    text(title, at: CGPoint(x: r.minX + 8, y: r.maxY - 18), font: smallFont, color: navy)
    text(subtitle, at: CGPoint(x: r.minX + 8, y: r.minY + 10), font: smallFont, color: gray)
}

let pageInfo: CFDictionary? = nil

// Page 1: cover
pdf.beginPDFPage(pageInfo)
rect(CGRect(x: 0, y: 0, width: pageW, height: pageH), fill: CGColor(red: 0.97, green: 0.99, blue: 1, alpha: 1))
rect(CGRect(x: 0, y: pageH - 250, width: pageW, height: 250), fill: navy, radius: 0)
text("AWS 플랫폼 대응 아키텍처", at: CGPoint(x: margin, y: pageH - 105), font: titleFont, color: .white)
text("AOBS Stack / Docker Swarm 기반 관측 시스템", at: CGPoint(x: margin, y: pageH - 138), font: bodyFont, color: CGColor(red: 0.82, green: 0.91, blue: 1, alpha: 1))
rect(CGRect(x: margin, y: 325, width: pageW - margin * 2, height: 180), fill: .white, stroke: CGColor(red: 0.78, green: 0.86, blue: 0.94, alpha: 1), radius: 12)
text("문서 목적", at: CGPoint(x: margin + 22, y: 468), font: headingFont, color: navy)
lines(["현재 프로젝트가 생성하는 Docker Swarm server/client stack을", "AWS VPC, ALB, EC2, EBS 환경에 배치하는 대응 구조와", "텔레메트리 데이터 흐름, 보안 경계, 운영 고려사항을 설명합니다."], at: margin + 22, y: 438, leading: 21)
text("핵심 결론", at: CGPoint(x: margin + 22, y: 362), font: smallFont, color: orange)
text("현재 코드와 가장 직접적으로 대응되는 AWS 배치 모델은 EC2 기반 Docker Swarm입니다.", at: CGPoint(x: margin + 22, y: 341), font: bodyFont, color: navy)
text("Generated 2026-08-01", at: CGPoint(x: margin, y: 70), font: smallFont, color: gray)
text("프로젝트 기준: README · Makefile · mk/*.mk · Docker Swarm templates", at: CGPoint(x: margin, y: 50), font: smallFont, color: gray)
pdf.endPDFPage()

// Page 2: mapping
pdf.beginPDFPage(pageInfo); header("1. AWS 리소스 대응과 배치 원칙", page: 2)
text("프로젝트 구성과 AWS 리소스 매핑", at: CGPoint(x: margin, y: 730), font: headingFont, color: navy)
let rows: [(String, String, String)] = [
    ("Docker Swarm manager", "EC2 3대 권장", "cluster control plane / quorum"),
    ("Swarm worker", "EC2 Auto Scaling Group", "application + observability services"),
    ("HAProxy :80", "ALB 뒤의 EC2 service", "ALB → HAProxy → Grafana"),
    ("ovs_observability", "Docker overlay network", "server/client stack shared network"),
    ("./data/opensearch*", "node별 EBS gp3", "OpenSearch data persistence"),
    ("Prometheus / Grafana / Loki data", "전용 EBS volume", "TSDB, dashboard, log store"),
    ("Container images", "NAT 또는 ECR", "private subnet image pull")
]
let tx: [CGFloat] = [margin, 190, 350]; let widths: [CGFloat] = [148, 150, 203]
let top: CGFloat = 650; let rowH: CGFloat = 34
for (i, title) in ["프로젝트 구성", "AWS 대응", "역할"].enumerated() {
    rect(CGRect(x: tx[i], y: top, width: widths[i], height: rowH), fill: paleBlue, stroke: CGColor(gray: 0.65, alpha: 1), radius: 0)
    text(title, at: CGPoint(x: tx[i] + 7, y: top + 11), font: smallFont, color: navy)
}
for (r, row) in rows.enumerated() {
    let y = top - CGFloat(r + 1) * rowH
    for (i, value) in [row.0, row.1, row.2].enumerated() {
        rect(CGRect(x: tx[i], y: y, width: widths[i], height: rowH), fill: r % 2 == 0 ? .white : CGColor(gray: 0.97, alpha: 1), stroke: CGColor(gray: 0.78, alpha: 1), radius: 0)
        text(value, at: CGPoint(x: tx[i] + 7, y: y + 11), font: smallFont, color: .black)
    }
}
text("배치 원칙", at: CGPoint(x: margin, y: 350), font: headingFont, color: navy)
bullet("ALB는 Public Subnet에, Swarm manager/worker와 데이터 서비스는 Private Subnet에 배치합니다.", at: 322)
bullet("OpenSearch multi-node 구성은 AZ를 분산하고, 노드별 EBS를 사용합니다.", at: 295)
bullet("관리 접속은 SSH 공개보다 Systems Manager Session Manager를 우선 고려합니다.", at: 268)
bullet("Private Subnet의 이미지 pull은 NAT Gateway 또는 ECR VPC endpoint 경로를 사용합니다.", at: 241)
rect(CGRect(x: margin, y: 120, width: pageW - margin * 2, height: 108), fill: paleOrange, stroke: orange)
text("중요한 전제", at: CGPoint(x: margin + 15, y: 198), font: headingFont, color: orange)
lines(["이 저장소에는 AWS IaC 코드가 없습니다.", "따라서 이 문서는 현재 Docker Swarm stack을 AWS에 배치하는 참조 설계이며,", "실제 VPC / IAM / SG / EC2 / EBS 생성은 Terraform, CloudFormation 또는 CDK로 별도 구현해야 합니다."], at: margin + 15, y: 172, leading: 18)
pdf.endPDFPage()

// Page 3: vector architecture diagram
pdf.beginPDFPage(pageInfo); header("2. AWS 플랫폼 구성 다이어그램", page: 3)
text("교차 연결을 제거한 3개 레인 구조 · 실선은 데이터, 점선은 제어/조회", at: CGPoint(x: margin, y: 742), font: smallFont, color: gray)
rect(CGRect(x: 30, y: 80, width: 535, height: 630), fill: CGColor(red: 0.99, green: 0.995, blue: 1, alpha: 1), stroke: orange, radius: 12)
text("AWS Account / Region", at: CGPoint(x: 45, y: 688), font: smallFont, color: orange)
rect(CGRect(x: 48, y: 112, width: 500, height: 550), fill: .white, stroke: blue, radius: 10)
text("VPC", at: CGPoint(x: 63, y: 642), font: smallFont, color: blue)

// Lane A: user entry path, left-to-right only.
text("A  사용자 진입 경로", at: CGPoint(x: 65, y: 610), font: smallFont, color: navy)
box("사용자", "operator / developer", at: CGRect(x: 65, y: 550, width: 80, height: 44), fill: paleOrange, stroke: orange)
box("IGW", "Internet Gateway", at: CGRect(x: 163, y: 550, width: 80, height: 44), fill: paleOrange, stroke: orange)
box("ALB", ":80 / :443", at: CGRect(x: 261, y: 550, width: 80, height: 44), fill: paleOrange, stroke: orange)
box("HAProxy", ":80", at: CGRect(x: 359, y: 550, width: 80, height: 44), fill: paleBlue)
box("Grafana", ":3000", at: CGRect(x: 457, y: 550, width: 72, height: 44), fill: paleBlue)
arrow(CGPoint(x: 145, y: 572), CGPoint(x: 163, y: 572), color: orange)
arrow(CGPoint(x: 243, y: 572), CGPoint(x: 261, y: 572), color: orange)
arrow(CGPoint(x: 341, y: 572), CGPoint(x: 359, y: 572), color: blue)
arrow(CGPoint(x: 439, y: 572), CGPoint(x: 457, y: 572), color: blue)

// Lane B: AWS compute/control and storage context.
text("B  AWS 실행 환경", at: CGPoint(x: 65, y: 505), font: smallFont, color: navy)
box("Swarm Manager", "EC2 control plane", at: CGRect(x: 65, y: 438, width: 120, height: 45), fill: paleOrange, stroke: orange)
box("Swarm Workers", "EC2 app + observability", at: CGRect(x: 215, y: 438, width: 135, height: 45), fill: paleOrange, stroke: orange)
box("EBS gp3", "./data/* persistence", at: CGRect(x: 380, y: 438, width: 120, height: 45), fill: palePurple, stroke: purple)
arrow(CGPoint(x: 185, y: 460), CGPoint(x: 215, y: 460), color: orange, dashed: true)
arrow(CGPoint(x: 350, y: 460), CGPoint(x: 380, y: 460), color: purple)
box("NAT Gateway", "private subnet egress", at: CGRect(x: 65, y: 375, width: 120, height: 40), fill: paleOrange, stroke: orange)
box("Security Groups", "least privilege", at: CGRect(x: 215, y: 375, width: 135, height: 40), fill: paleOrange, stroke: orange)
box("Docker Hub / ECR", "container images", at: CGRect(x: 380, y: 375, width: 120, height: 40), fill: palePurple, stroke: purple)
// NAT → registry is routed below the Security Groups policy box so the policy
// node is not visually mistaken for a network hop.
line(CGPoint(x: 125, y: 375), CGPoint(x: 125, y: 360), color: orange, dashed: true)
line(CGPoint(x: 125, y: 360), CGPoint(x: 440, y: 360), color: orange, dashed: true)
arrow(CGPoint(x: 440, y: 360), CGPoint(x: 440, y: 375), color: orange, dashed: true)
text("private subnet image pull", at: CGPoint(x: 250, y: 348), font: smallFont, color: orange)

// Lane C: telemetry data path, left-to-right only.
rect(CGRect(x: 65, y: 155, width: 435, height: 185), fill: paleBlue, stroke: blue, radius: 8)
text("C  Docker Swarm services / ovs_observability", at: CGPoint(x: 80, y: 318), font: smallFont, color: navy)
box("Apps + host logs", "OTLP / /var/log", at: CGRect(x: 80, y: 245, width: 92, height: 48), fill: .white)
box("Client agents", "Alloy / OTel / FB", at: CGRect(x: 190, y: 245, width: 92, height: 48), fill: .white)
box("Central OTel", "4317 / 4318", at: CGRect(x: 300, y: 245, width: 92, height: 48), fill: .white)
box("Logs backends", "OS / Loki", at: CGRect(x: 410, y: 245, width: 75, height: 48), fill: palePurple, stroke: purple)
arrow(CGPoint(x: 172, y: 269), CGPoint(x: 190, y: 269), color: blue)
arrow(CGPoint(x: 282, y: 269), CGPoint(x: 300, y: 269), color: blue)
arrow(CGPoint(x: 392, y: 269), CGPoint(x: 410, y: 269), color: purple)
box("Prometheus", "metrics :8889", at: CGRect(x: 300, y: 180, width: 92, height: 38), fill: paleBlue, stroke: blue)
arrow(CGPoint(x: 346, y: 245), CGPoint(x: 346, y: 218), label: "metrics", color: blue)
text("Grafana 조회는 Lane A의 Grafana에서 Backends / Prometheus로 이어집니다.", at: CGPoint(x: 80, y: 168), font: smallFont, color: gray)
text("실선: 데이터 흐름    점선: 제어 / 이미지 / 운영 관계", at: CGPoint(x: 65, y: 92), font: smallFont, color: gray)
pdf.endPDFPage()

// Page 4: flows and security
pdf.beginPDFPage(pageInfo); header("3. 데이터 흐름과 보안 경계", page: 4)
text("관측 데이터 흐름", at: CGPoint(x: margin, y: 742), font: headingFont, color: navy)
let flowBoxes = [("1", "애플리케이션", "logs / metrics"), ("2", "Alloy / OTel", "OTLP receiver"), ("3", "Central OTel", "batch + limit"), ("4", "저장소", "OS / Loki / Prom"), ("5", "Grafana", "query + dashboard")]
for i in 0..<flowBoxes.count {
    let x = margin + CGFloat(i) * 101
    rect(CGRect(x: x, y: 650, width: 88, height: 66), fill: i == 3 ? palePurple : paleBlue, stroke: i == 3 ? purple : blue)
    text(flowBoxes[i].0, at: CGPoint(x: x + 8, y: 695), font: headingFont, color: i == 3 ? purple : blue)
    text(flowBoxes[i].1, at: CGPoint(x: x + 8, y: 677), font: smallFont, color: navy)
    text(flowBoxes[i].2, at: CGPoint(x: x + 8, y: 660), font: smallFont, color: gray)
    if i < 4 { arrow(CGPoint(x: x + 88, y: 683), CGPoint(x: x + 101, y: 683), color: gray) }
}
text("보안 경계", at: CGPoint(x: margin, y: 585), font: headingFont, color: navy)
let security = [
    ("Internet → ALB", "사용자 접근은 ALB에서 종료합니다. 운영 환경에서는 ACM 인증서와 HTTPS를 권장합니다."),
    ("ALB → HAProxy", "ALB target group은 Swarm worker의 HAProxy :80만 허용합니다."),
    ("Client → Collector", "OTLP :4317/:4318은 애플리케이션 worker와 collector 사이에서만 허용합니다."),
    ("Prometheus → Exporter", "Prometheus가 node-exporter :9100, OTel :8889를 scrape합니다."),
    ("Agents → Backends", "OpenSearch :9200, Loki :3100은 Private Subnet 내부에서만 사용합니다.")
]
for (i, pair) in security.enumerated() {
    let y = 548 - CGFloat(i) * 57
    rect(CGRect(x: margin, y: y - 28, width: 145, height: 38), fill: paleOrange, stroke: orange)
    text(pair.0, at: CGPoint(x: margin + 8, y: y - 5), font: smallFont, color: orange)
    lines([pair.1], at: margin + 165, y: y - 4, leading: 14, font: smallFont)
}
rect(CGRect(x: margin, y: 105, width: pageW - margin * 2, height: 100), fill: paleOrange, stroke: orange)
text("운영 보안 체크", at: CGPoint(x: margin + 14, y: 180), font: headingFont, color: orange)
lines(["• OpenSearch / Loki를 인터넷에 직접 노출하지 않기", "• 비밀번호는 .env/명령행 대신 Secrets Manager 또는 SSM Parameter Store 연계", "• Swarm 관리 포트는 manager/worker SG 내부에서만 허용"], at: margin + 14, y: 151, leading: 18, font: smallFont)
pdf.endPDFPage()

// Page 5: deployment and limitations
pdf.beginPDFPage(pageInfo); header("4. 배포 순서와 확장 방향", page: 5)
text("AWS 배포 순서", at: CGPoint(x: margin, y: 742), font: headingFont, color: navy)
let steps = ["AWS VPC / Subnet / Route Table / SG 준비", "EC2 Swarm manager와 worker 초기화", "EBS mount 및 Docker data directory 연결", "환경 변수와 Secret 준비", "make stack → make deploy", "make client-stack → docker stack deploy", "ALB health check와 Grafana / Prometheus / OpenSearch 검증"]
for (i, step) in steps.enumerated() {
    let y = 705 - CGFloat(i) * 39
    pdf.setFillColor(blue); pdf.fillEllipse(in: CGRect(x: margin, y: y - 4, width: 20, height: 20))
    text("\(i + 1)", at: CGPoint(x: margin + 6, y: y + 1), font: smallFont, color: .white)
    text(step, at: CGPoint(x: margin + 33, y: y + 1), font: bodyFont)
    if i < steps.count - 1 { line(CGPoint(x: margin + 10, y: y - 4), CGPoint(x: margin + 10, y: y - 25), color: blue) }
}
text("현재 코드의 한계와 권장 확장", at: CGPoint(x: margin, y: 410), font: headingFont, color: navy)
let limits = [("정적 node-exporter IP", "EC2 service discovery 또는 DNS 기반 scrape로 확장"), ("EC2 bind mount", "EBS snapshot / backup lifecycle 자동화"), ("컨테이너 OpenSearch", "Amazon OpenSearch Service 전환 검토"), ("HTTP ingress", "ALB HTTPS + ACM + WAF 적용"), ("직접 Swarm 배포", "CI/CD와 Terraform/CloudFormation 도입")]
for (i, item) in limits.enumerated() {
    let y = 372 - CGFloat(i) * 42
    text("• \(item.0)", at: CGPoint(x: margin, y: y), font: smallFont, color: navy)
    text(item.1, at: CGPoint(x: 185, y: y), font: smallFont, color: gray)
}
rect(CGRect(x: margin, y: 65, width: pageW - margin * 2, height: 90), fill: paleBlue, stroke: blue)
text("참고 파일", at: CGPoint(x: margin + 14, y: 132), font: headingFont, color: navy)
lines(["docs/architecture-diagrams.md  ·  Mermaid 원문", "README.md / Makefile / mk/*.mk  ·  설정과 배포 명령", "src/templates/*.hbs  ·  서버 및 클라이언트 stack 구조"], at: margin + 14, y: 107, leading: 17, font: smallFont)
pdf.endPDFPage()

pdf.closePDF()
