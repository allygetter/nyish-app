              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#6B3A28" }}>{ex.label}</div>
                <div style={{ fontSize: 11.5, color: "#A79B78" }}>{ex.count} record{ex.count === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" icon={<Download size={14} />} onClick={() => downloadCsv(`${ex.file}.csv`, toCsv(ex.rows, ex.cols))} disabled={ex.count === 0}>CSV</Btn>
              <Btn variant="ghost" icon={<FileText size={14} />} onClick={() => downloadPdf(`${ex.file}.pdf`, ex.label, ex.cols, ex.rows, mName)} disabled={ex.count === 0}>PDF</Btn>
            </div>
          </Card>
        ))}
      </div>
    </DetailShell>
  );
}

function ConstitutionPage({ ctx, onBack }) {
  const { isChair, constitution, persist, notify } = ctx;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(constitution);

  const download = () => {
    const blob = new Blob([constitution], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NYISH_Constitution.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    await persist.constitution(draft);
    notify("Constitution updated.");
    setEditing(false);
  };

  return (
    <DetailShell title="Constitution" onBack={onBack}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn variant="gold" icon={<Download size={15} />} onClick={download}>Download</Btn>
        {isChair && !editing && <Btn variant="ghost" onClick={() => { setDraft(constitution); setEditing(true); }}>Edit</Btn>}
      </div>
      {editing ? (
        <Card>
          <textarea style={{ ...inputStyle, minHeight: 320, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn variant="primary" onClick={save}>Save changes</Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Work Sans, sans-serif", fontSize: 13, lineHeight: 1.6, color: "#3A3524", margin: 0 }}>{constitution}</pre>
        </Card>
      )}
    </DetailShell>
  );
}

async function drawCertificateOnCanvas(canvas, member) {
  const ctx2d = canvas.getContext("2d");
  const W = 900, H = 640;
  canvas.width = W; canvas.height = H;

  ctx2d.fillStyle = "#F7F2E4";
  ctx2d.fillRect(0, 0, W, H);
  ctx2d.strokeStyle = "#C99A2E";
  ctx2d.lineWidth = 6;
  ctx2d.strokeRect(24, 24, W - 48, H - 48);
  ctx2d.strokeStyle = "#6B3A28";
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeRect(36, 36, W - 72, H - 72);

  if (member.photo) {
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = member.photo;
      });
      const cx = W - 130, cy = 100, r = 46;
      ctx2d.save();
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2d.closePath();
      ctx2d.clip();
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx2d.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx2d.restore();
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2d.strokeStyle = "#C99A2E";
      ctx2d.lineWidth = 3;
      ctx2d.stroke();
    } catch {
      // ignore broken photo, certificate still renders without it
    }
  }

  ctx2d.textAlign = "center";
  ctx2d.fillStyle = "#6B3A28";
  ctx2d.font = "600 15px Work Sans, sans-serif";
  ctx2d.fillText("CERTIFICATE OF MEMBERSHIP", W / 2, 110);

  ctx2d.font = "700 34px Fraunces, serif";
  ctx2d.fillText(GROUP_NAME, W / 2, 155);

  ctx2d.font = "14px Work Sans, sans-serif";
  ctx2d.fillStyle = "#6B6350";
  ctx2d.fillText("This certifies that", W / 2, 230);

  ctx2d.font = "600 40px Fraunces, serif";
  ctx2d.fillStyle = "#8B4A2B";
  ctx2d.fillText(member.name, W / 2, 285);

  ctx2d.font = "14px Work Sans, sans-serif";
  ctx2d.fillStyle = "#6B6350";
  ctx2d.fillText("is a registered and active member of " + GROUP_SHORT + ",", W / 2, 330);
  ctx2d.fillText("having joined on " + member.joinDate + ".", W / 2, 352);

  ctx2d.save();
  ctx2d.translate(W / 2, 460);
  ctx2d.beginPath(); ctx2d.arc(0, 0, 58, 0, Math.PI * 2); ctx2d.strokeStyle = "#C99A2E"; ctx2d.lineWidth = 3; ctx2d.stroke();
  ctx2d.beginPath(); ctx2d.arc(0, 0, 48, 0, Math.PI * 2); ctx2d.setLineDash([2, 4]); ctx2d.stroke(); ctx2d.setLineDash([]);
  ctx2d.font = "700 16px Fraunces, serif"; ctx2d.fillStyle = "#C99A2E"; ctx2d.fillText("NYISH", 0, -4);
  ctx2d.font = "8px Work Sans, sans-serif"; ctx2d.fillText("NGUUMO", 0, 12);
  ctx2d.restore();

  ctx2d.font = "12px Work Sans, sans-serif";
  ctx2d.fillStyle = "#A79B78";
  ctx2d.fillText("Member ID: " + member.id.toUpperCase(), W / 2, 560);
  ctx2d.fillText(
    member.kraPin ? `KRA PIN: ${member.kraPin}   ·   Issued ${todayISO()}` : "Issued " + todayISO(),
    W / 2, 578
  );
}

// Renders a member's certificate off-screen and returns raw base64 PNG data
// (no data-URL prefix) — used to email it as an attachment on approval.
async function renderCertificateBase64(member) {
  const canvas = document.createElement("canvas");
  await drawCertificateOnCanvas(canvas, member);
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}

function CertificatePage({ ctx, onBack }) {
  const { me } = ctx;
  const canvasRef = useRef(null);
  const eligible = me.status === "active";

  useEffect(() => {
    if (!eligible || !canvasRef.current) return;
    let cancelled = false;
    drawCertificateOnCanvas(canvasRef.current, me).catch(() => {});
    return () => { cancelled = true; };
  }, [eligible, me]);

  const download = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `NYISH_Certificate_${me.name.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  return (
    <DetailShell title="My certificate" onBack={onBack}>
      {!eligible ? (
        <Card><EmptyState icon={<Award size={22} color="#C9BE9E" />} text="Your membership is still pending approval." /></Card>
      ) : (
        <>
          <Card style={{ padding: 8, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }} />
          </Card>
          <div style={{ marginTop: 14 }}>
            <Btn variant="gold" full icon={<Download size={16} />} onClick={download}>Download certificate (PNG)</Btn>
          </div>
        </>
      )}
    </DetailShell>
  );
}

function ProfilePage({ ctx, onBack, openMore }) {
  const { me, persist, notify } = ctx;
  const [form, setForm] = useState({
    name: me.name, email: me.email || "", kraPin: me.kraPin || "",
