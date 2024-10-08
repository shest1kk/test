export const updateTranslation = (animationFrameId, canvasTranslation, setCanvasTranslation, imagePosition, setImagePosition, dx, dy) => {
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(() => {
        setCanvasTranslation(prevTranslation => ({
            x: prevTranslation.x + dx,
            y: prevTranslation.y + dy
        }));
        setImagePosition(prevPosition => ({
            x: prevPosition.x + dx,
            y: prevPosition.y + dy
        }));
    });
};

export const handleMouseDown = (toolActive, setIsDragging) => {
    if (toolActive === "hand") {
        setIsDragging(true);
    }
};

export const handleMouseUp = (setIsDragging) => {
    setIsDragging(false);
};

export const handleKeyDown = (step, toolActive, canvasTranslation, setCanvasTranslation, e) => {
    if (toolActive === "hand") {
        switch (e.key) {
            case "ArrowLeft":
                setCanvasTranslation({
                    x: canvasTranslation.x - step,
                    y: canvasTranslation.y
                });
                break;
            case "ArrowRight":
                setCanvasTranslation({
                    x: canvasTranslation.x + step,
                    y: canvasTranslation.y
                });
                break;
            case "ArrowUp":
                setCanvasTranslation({
                    x: canvasTranslation.x,
                    y: canvasTranslation.y - step
                });
                break;
            case "ArrowDown":
                setCanvasTranslation({
                    x: canvasTranslation.x,
                    y: canvasTranslation.y + step
                });
                break;
            default:
                break;
        }
    }
};

export const handleKeyUp = (toolActive, canvasTranslation, setCanvasTranslation, e) => {
    if (toolActive === "hand") {
        switch (e.key) {
            case "ArrowLeft":
            case "ArrowRight":
            case "ArrowUp":
            case "ArrowDown":
                // Остановить перемещение при отпускании к��авиши
                setCanvasTranslation({
                    x: canvasTranslation.x,
                    y: canvasTranslation.y
                });
                break;
            default:
                break;
        }
    }
};