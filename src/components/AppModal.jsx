import { useEffect, useRef, useState } from "react"
import QRCodeStyling from "qr-code-styling"

const DEFAULT_STATE = {
    open: false,
    kind: "message",
    type: "success",
    title: "",
    text: "",
    buttonText: "Aceptar",
    showButton: true,
    showProgress: false,
    badgeText: "",
    note: "",
    qrData: "",
    closeOnBackdrop: true,
    showCloseButton: false,
}

export default function AppModal({ modalId }) {
    const [config, setConfig] = useState(DEFAULT_STATE)
    const [isVisible, setIsVisible] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const qrRef = useRef(null)
    const qrInstanceRef = useRef(null)
    const closeTimeoutRef = useRef(null)

    useEffect(() => {
        const handleOpen = (event) => {
            if (event.detail?.id !== modalId) return
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current)
                closeTimeoutRef.current = null
            }
            setIsClosing(false)
            setConfig({
                ...DEFAULT_STATE,
                ...event.detail.config,
                open: true,
            })
            setIsVisible(true)
        }

        const handleClose = (event) => {
            if (event.detail?.id !== modalId) return
            triggerClose()
        }

        window.addEventListener("app-modal:open", handleOpen)
        window.addEventListener("app-modal:close", handleClose)

        return () => {
            window.removeEventListener("app-modal:open", handleOpen)
            window.removeEventListener("app-modal:close", handleClose)
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current)
            }
        }
    }, [modalId])

    useEffect(() => {
        if (!isVisible) {
            document.body.classList.remove("app-modal-open")
            return
        }

        document.body.classList.add("app-modal-open")
        return () => document.body.classList.remove("app-modal-open")
    }, [isVisible])

    useEffect(() => {
        if (!isVisible || isClosing || config.kind !== "qr" || !config.qrData || !qrRef.current) {
            if (qrRef.current) qrRef.current.innerHTML = ""
            qrInstanceRef.current = null
            return
        }

        qrRef.current.innerHTML = ""
        qrInstanceRef.current = new QRCodeStyling({
            width: 280,
            height: 280,
            type: "svg",
            data: config.qrData,
            dotsOptions: { color: "#111111", type: "rounded" },
            cornersSquareOptions: { color: "#b89e0c", type: "extra-rounded" },
            backgroundOptions: { color: "#f8f1d5" },
            image: "/marcoaldany.ico",
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 8,
                imageSize: 0.26,
            },
        })

        qrInstanceRef.current.append(qrRef.current)
    }, [isVisible, isClosing, config.kind, config.qrData])

    useEffect(() => {
        const canManualClose =
            config.showCloseButton || config.closeOnBackdrop || config.showButton

        const onKeyDown = (event) => {
            if (event.key === "Escape" && isVisible && canManualClose) {
                triggerClose()
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isVisible, config.showButton, config.showCloseButton, config.closeOnBackdrop])

    const triggerClose = () => {
        if (!isVisible || isClosing) return

        setIsClosing(true)
        closeTimeoutRef.current = setTimeout(() => {
            setIsVisible(false)
            setIsClosing(false)
            setConfig((prev) => ({ ...prev, open: false }))
            closeTimeoutRef.current = null
            window.dispatchEvent(
                new CustomEvent("app-modal:closed", {
                    detail: { id: modalId },
                }),
            )
        }, 260)
    }

    if (!isVisible) return null

    return (
        <div className={`app-modal ${isClosing ? "closing" : "opening"}`}>
            <div
                className="app-modal-backdrop"
                onClick={() => config.closeOnBackdrop && triggerClose()}
            />
            <div className={`app-modal-card ${config.type} ${config.kind}`}>
                {config.showCloseButton ? (
                    <button
                        type="button"
                        className="app-modal-close"
                        onClick={triggerClose}
                    >
                        ×
                    </button>
                ) : null}

                {config.kind === "message" ? (
                    <>
                        <div className="app-modal-icon-row">
                            <img
                                className="app-modal-icon"
                                src={config.type === "success" ? "/verify.png" : "/error.png"}
                                alt=""
                            />
                        </div>
                        <h2>{config.title}</h2>
                        <p>{config.text}</p>
                        {config.showProgress ? (
                            <div className="app-modal-progress">
                                <div className="app-modal-progress-bar animating" />
                            </div>
                        ) : null}
                        {config.showButton ? (
                            <div className="app-modal-actions">
                                <button className="acpbutton" onClick={triggerClose}>
                                    {config.buttonText}
                                </button>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <>
                        <span className="app-modal-badge">
                            {config.badgeText || "Listo para canjear"}
                        </span>
                        <h2>{config.title}</h2>
                        {config.text ? <p className="app-modal-value">{config.text}</p> : null}
                        <p>{config.note}</p>
                        <div className="app-modal-qr-shell">
                            <div ref={qrRef} />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
