import React, { useRef, useContext, useEffect, useState, useCallback } from "react";
import { ImageContext } from "@/ImageProvider";
import "./Editor.css";

import ButtonIcon from "@components/ButtonIcon/ButtonIcon";
import Modal from "@components/Modal/Modal";
import Input from "@components/Input/Input";
import ScalingModal from "./ScalingModal/ScalingModal";
import ContextModal from "@components/ContextModal/ContextModal";
import CurvesModal from "./CurvesModal/CurvesModal";
import FilterModal from "./FilterModal/FilterModal";

import {
  updateTranslation,
  handleKeyDown,
  handleKeyUp,
  handleMouseUp,
} from "@utils/CanvasChange/canvasKeyHand";
import {
  extractRGB,
  rgbToXyz,
  rgbToLab,
  calculateContrast,
} from "@utils/RonvertColours/ronvertColours";

const Editor = () => {
  const { image, setImage } = useContext(ImageContext);

  const [toolActive, setToolActive] = useState("cursor");
  const [pipetteColor1, setPipetteColor1] = useState("");
  const [pipetteColor2, setPipetteColor2] = useState("");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [fileSize, setFileSize] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(100); // Default to 100%
  const [infoActive, setInfoActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasTranslation, setCanvasTranslation] = useState({ x: 0, y: 0 });
  const [imageCoordinates, setImageCoordinates] = useState({
    base: { x: 0, y: 0 },
    extra: { x: 0, y: 0 },
  });
  const [showBg, setShowBg] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalCurvesOpen, setIsModalCurvesOpen] = useState(false);
  const [isModalFilterOpen, setIsModalFilterOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  const [showImageChoice, setShowImageChoice] = useState(true);

  const canvas = useRef();
  const context = useRef();
  const animationFrameId = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false); // Track mouse button state
  const [selectedTool, setSelectedTool] = useState("cursor"); // New state to track selected tool
  const [isMouseWheel, setIsMouseWheel] = useState(false); // New state to track mouse wheel state

  const imageObj = new Image();
  imageObj.src = image;

  useEffect(() => {
    const savedImage = localStorage.getItem('lastEditedImage');
    if (savedImage && !image) {
      setShowImageChoice(true);
    } else {
      setShowImageChoice(false);
    }
  }, [image]);

  const handleContinueEditing = () => {
    const savedImage = localStorage.getItem('lastEditedImage');
    if (savedImage) {
      setImage(savedImage);
    }
    setShowImageChoice(false);
  };

  const handleLoadNewImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        localStorage.setItem('lastEditedImage', event.target.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
    setShowImageChoice(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
    setToolActive("cursor");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsModalCurvesOpen(false);
    setIsModalFilterOpen(false);
  };

  const openContextModal = () => {
    setIsContextModalOpen(true);
    setToolActive("cursor");
    setInfoActive(true);
  };

  const closeContextModal = () => {
    setIsContextModalOpen(false);
    setToolActive("cursor");
    setInfoActive(false);
  };

  const handleScaleChange = (event) => {
    const newScaleFactor = event.target.value;
    setScaleFactor(newScaleFactor);
    console.log("Selected scaling method: Бикубический"); // Log the selected scaling method
  };

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.src = image;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const workspace = document.querySelector(".workspace");
      if (!workspace) return;

      const { offsetWidth: workspaceWidth, offsetHeight: workspaceHeight } = workspace;
      const maxWidth = workspaceWidth - 100;
      const maxHeight = workspaceHeight - 100;

      const widthScale = maxWidth / img.width;
      const heightScale = maxHeight / img.height;
      const newScaleFactor = Math.min(widthScale, heightScale);
      if (scaleFactor === 0) setScaleFactor(newScaleFactor);

      const scaledWidth = img.width * (scaleFactor / 100);
      const scaledHeight = img.height * (scaleFactor / 100);

      const canvasElement = canvas.current;
      if (!canvasElement) return;

      context.current = canvasElement.getContext("2d");
      context.current.imageSmoothingEnabled = true;
      img.willReadFrequently = true;

      canvasElement.width = workspaceWidth;
      canvasElement.height = workspaceHeight;
      context.current.clearRect(0, 0, canvasElement.width, canvasElement.height);
      context.current.drawImage(
        img,
        canvasTranslation.x + (maxWidth - scaledWidth) / 2 + 50,
        canvasTranslation.y + (maxHeight - scaledHeight) / 2 + 50,
        scaledWidth,
        scaledHeight
      );

      setDimensions({ width: scaledWidth, height: scaledHeight });
      setFileSize(Math.floor((img.src.length / 1024) * 0.77));

      const handleWheel = (event) => {
        event.preventDefault();
        const delta = event.deltaY;
        const scaleSteps = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300];
        const currentIndex = scaleSteps.indexOf(scaleFactor);
        let newIndex = currentIndex;

        if (delta < 0) { // Change direction for zooming in
          newIndex = Math.min(currentIndex + 1, scaleSteps.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        setScaleFactor(scaleSteps[newIndex]);
      };

      const handleTouchZoom = (event) => {
        if (event.touches.length === 2) {
          const touch1 = event.touches[1];
          const touch2 = event.touches[0];
          const distance = Math.sqrt(
            (touch1.clientX - touch2.clientX) ** 2 +
            (touch1.clientY - touch2.clientY) ** 2
          );
          const newScaleFactor = Math.max(10, Math.min(300, 200 / distance)); // Adjust scaling factor based on distance
          setScaleFactor(newScaleFactor);
        }
      };

      canvasElement.addEventListener("wheel", handleWheel);
      canvasElement.addEventListener("touchmove", handleTouchZoom);
      return () => {
        if (canvasElement) {
          canvasElement.removeEventListener("wheel", handleWheel);
          canvasElement.removeEventListener("touchmove", handleTouchZoom);
        }
      };
    };
  }, [image, scaleFactor, canvasTranslation]);

  const [currentColor, setCurrentColor] = useState("");

  const handleMouseMove = useCallback((e) => {
    const canvasElement = canvas.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setCursor({ x, y });

      // Add color picking logic when the pipette tool is active
      if (toolActive === "pipette") {
        const ctx = canvasElement.getContext('2d');
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const color = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
        setCurrentColor(color);
      }
    }

    if (isDragging && (toolActive === "hand" || isMouseWheel)) {
      const dx = e.clientX - rect.left - cursor.x;
      const dy = e.clientY - rect.top - cursor.y;
      updateTranslation(animationFrameId, canvasTranslation, setCanvasTranslation, dx, dy, dimensions.width, dimensions.height, scaleFactor);
    }
  }, [isDragging, toolActive, isMouseWheel, cursor.x, cursor.y, canvasTranslation, dimensions.width, dimensions.height, scaleFactor]);

  const handleKeyDownEvent = (e) => handleKeyDown(toolActive, canvasTranslation, setCanvasTranslation, e);
  const handleKeyUpEvent = (e) => handleKeyUp(toolActive, canvasTranslation, setCanvasTranslation, e);
  const handleMouseUpEvent = () => {
    handleMouseUp(setIsDragging);
    setIsMouseDown(false);
    if (!isMouseWheel && selectedTool !== "hand" && selectedTool !== "pipette") {
      setToolActive("cursor");
      setSelectedTool("cursor");
    }
  };
  const handleMouseDownEvent = () => {
    setIsMouseDown(true);
    if (selectedTool === "hand" || isMouseWheel) {
      setToolActive("hand");
      setIsDragging(true);
    }
  };

  const handleMouseWheelDown = (e) => {
    if (e.button === 1) { // Middle mouse button
      setIsMouseWheel(true);
      setToolActive("hand");
      setSelectedTool("hand");
      setIsDragging(true);
    }
  };

  const handleMouseWheelUp = (e) => {
    if (e.button === 1) { // Middle mouse button
      setIsMouseWheel(false);
      if (selectedTool !== "hand") {
        setToolActive("cursor");
        setSelectedTool("cursor");
      }
      setIsDragging(false);
    }
  };

  useEffect(() => {
    const handleKeyDownShortcut = (event) => {
      switch (event.code) {
        case "KeyC":
          setSelectedTool("cursor");
          setToolActive("cursor");
          break;
        case "KeyP":
          setSelectedTool("pipette");
          setToolActive("pipette");
          setInfoActive(true);
          break;
        case "KeyH":
          setSelectedTool("hand");
          setToolActive("hand");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDownShortcut);
    const canvasElement = canvas.current;
    if (canvasElement) {
      canvasElement.addEventListener("mousedown", handleMouseWheelDown);
      canvasElement.addEventListener("mouseup", handleMouseWheelUp);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDownShortcut);
      if (canvasElement) {
        canvasElement.removeEventListener("mousedown", handleMouseWheelDown);
        canvasElement.removeEventListener("mouseup", handleMouseWheelUp);
      }
    };
  }, []);

  const handleDownload = () => {
    const canvasRef = canvas.current;
    if (!canvasRef) return;

    const context = canvasRef.getContext("2d");

    const img = new Image();
    img.src = image;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvasRef.width = img.width;
      canvasRef.height = img.height;
      context.drawImage(img, 0, 0);
      const url = canvasRef.toDataURL();
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = url;
      a.download = "editedImage.png";
      a.click();
      document.body.removeChild(a);
    };
  };

  const showPreview = (value) => setShowBg(value);

  const openCurvesModal = () => {
    setIsModalCurvesOpen(true);
    setToolActive("cursor");
  };

  const openFilterModal = () => {
    setIsModalFilterOpen(true);
    setToolActive("cursor");
  };

  const handleCanvasClick = (event) => {
    const canvasRef = canvas.current;
    if (!canvasRef) return;

    const { offsetX: x, offsetY: y } = event.nativeEvent;
    
    const workspace = document.querySelector(".workspace");
    if (!workspace) return;

    const paddingW = workspace.offsetWidth - dimensions.width;
    const paddingH = workspace.offsetHeight - dimensions.height;

    if (toolActive === "pipette") {
      const coordinates = {
        x: x - paddingW / 2 - canvasTranslation.x,
        y: y - paddingH / 2 - canvasTranslation.y,
      };
      event.altKey ? (setPipetteColor2(currentColor), setImageCoordinates((prev) => ({ ...prev, extra: coordinates }))) : (setPipetteColor1(currentColor), setImageCoordinates((prev) => ({ ...prev, base: coordinates })));
    }
  };

  const updateImage = (image) => {
    console.log(image);
    setImage(image);
    localStorage.setItem('lastEditedImage', image);
  };

  useEffect(() => {
    const handleKeyDownEvent = (e) => handleKeyDown(toolActive, canvasTranslation, setCanvasTranslation, e);
    document.body.addEventListener("keydown", handleKeyDownEvent);
    return () => document.body.removeEventListener("keydown", handleKeyDownEvent);
  }, [toolActive, canvasTranslation]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (image) {
        localStorage.setItem('lastEditedImage', image);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [image]);

  if (showImageChoice) {
    return (
      <div className="image-choice" style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <h2>Выберите действие:</h2>
        <button onClick={handleContinueEditing} style={{margin: '10px'}}>Вернуться к редактированию последнего изображения</button>
        <button onClick={handleLoadNewImage} style={{margin: '10px'}}>Загрузить новое изображение</button>
      </div>
    );
  }

  return (
    <section className="editor">
      <div className="editor__menu-bar menu-bar">
        <div className="menu-bar__actions">
          <ButtonIcon link="/" onClick={() => localStorage.removeItem('lastEditedImage')}>Главная</ButtonIcon>
          {image && (
            <>
              <ButtonIcon title="Скачать" onClick={handleDownload}>Скачать</ButtonIcon>
              {/* <ButtonIcon title="Масштабирование" onClick={openModal}>Масштабировать</ButtonIcon>
              <ButtonIcon title="Кривые" onClick={openCurvesModal}>Кривые</ButtonIcon>
              <ButtonIcon title="Фильтрация" onClick={openFilterModal}>Фильтрация</ButtonIcon> */}
            </>
          )}
        </div>
        {/* {image && (
          <div className="menu-bar__regulators">
            <div className="menu-bar__size">
              <p className="menu-bar__desc">Масштабирование изображения в %</p>
              <input
                type="range"
                min="10"
                max="300"
                value={scaleFactor}
                onChange={handleScaleChange}
                className="scale-slider"
              />
              <span>{scaleFactor}%</span>
            </div>
          </div>
        )} */}
      </div>
      <div className="editor__tool-panel tool-panel">
        {["cursor", "pipette", "hand"].map((tool) => (
          <ButtonIcon
            key={tool}
            title={tool === "cursor" ? "Курсор" : tool === "pipette" ? "Пипетка" : "Рука"}
            onClick={() => {
              setSelectedTool(tool);
              setToolActive(tool);
              if (tool === "pipette") {
                setInfoActive(true);
                setIsContextModalOpen(true);
              }
            }}
            active={selectedTool === tool || (isMouseWheel && tool === "hand")}
            tooltip={tool === "cursor" ? "Обычный указатель для работы с объектами и сброса других инструментов." : tool === "pipette" ? "Инструмент пипетки позволяет выбирать цвета изображения." : "Инструмент для перемещения области просмотра изображения."}
          >
            <svg className="tool-panel__icon" role="img" fill="currentColor" viewBox={tool === "cursor" ? "0 0 18 18" : tool === "pipette" ? "0 0 18 18" : "0 0 512 512"} width="18" height="18" aria-hidden="true" focusable="false">
              {tool === "cursor" ? (
                <path fillRule="evenodd" d="M4.252,1.027A.25.25,0,0,0,4,1.277V17.668a.25.25,0,0,0,.252.25.246.246,0,0,0,.175-.074L9.262,13h6.5a.25.25,0,0,0,.176-.427L4.427,1.1A.246.246,0,0,0,4.252,1.027Z"></path>
              ) : tool === "pipette" ? (
                <path fillRule="evenodd" d="M11.228,8.519,4.116,15.631a1.235,1.235,0,1,1-1.747-1.747L9.481,6.772Zm3.636-7.466a1.8,1.8,0,0,0-1.273.527L11.328,3.843l-.707-.707a.5.5,0,0,0-.707,0L8.234,4.817a.5.5,0,0,0,0,.707l.54.54L1.662,13.177a2.235,2.235,0,1,0,3.161,3.161l7.113-7.112.54.54a.5.5,0,0,0,.707,0l1.681-1.68a.5.5,0,0,0,0-.707l-.707-.707L16.42,4.409a1.8,1.8,0,0,0,0-2.546l-.283-.283a1.8,1.8,0,0,0-1.273-.527Z"></path>
              ) : (
                <path d="M82.42,209.08h0c15.06-6.62,32.38,1.31,38.5,17.62L156,312h11.27V80c0-17.6,13.3-32,29.55-32h0c16.26,0,29.55,14.4,29.55,32V231.75l14.78.25V32c0-17.6,13.3-32,29.55-32h0C287,0,300.25,14.4,300.25,32V231.75L315,232V64c0-17.6,13.3-32,29.55-32h0C434.7,96,448,110.4,448,128V344c0,75.8-37.13,168-169,168-40.8,0-79.42-7-100.66-21a121.41,121.41,0,0,1-33.72-33.31,138,138,0,0,1-16-31.78L66.16,250.77C60.05,234.46,67.36,215.71,82.42,209.08Z" />
              )}
            </svg>
          </ButtonIcon>
        ))}

        <ButtonIcon
          title="Информация"
          onClick={() => {
            setInfoActive(!infoActive);
            infoActive ? closeContextModal() : openContextModal();
          }}
          active={infoActive}
          tooltip="Показать информацию о цветах, выбранных с помощью пипетки."
        >
          <svg className="tool-panel__icon" role="img" fill="currentColor" viewBox="0 0 32 32" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <g data-name="Layer 2" id="Layer_2">
              <path d="M16,12a2,2,0,1,1,2-2A2,2,0,0,1,16,12Zm0-2Z" />
              <path d="M16,29A13,13,0,1,1,29,16,13,13,0,0,1,16,29ZM16,5A11,11,0,1,0,27,16,11,11,0,0,0,16,5Z" />
              <path d="M16,24a2,2,0,0,1-2-2V16a2,2,0,0,1,4,0v6A2,2,0,0,1,16,24Zm0-8v0Z" />
            </g>
          </svg>
        </ButtonIcon>
        

      </div>

      <ContextModal
        isOpen={isContextModalOpen || toolActive === "pipette"}
        onClose={closeContextModal}
        title="Пипетка"
      >
        <div className="editor__all-colors">
          {["Цвет #1", "Цвет #2 (зажми alt)", "Текущий цвет"].map((label, index) => (
            <div className="editor__info-color" key={index}>
              <p className="status-bar__text">{label}:</p>
              <div className="status-bar__color" style={{ backgroundColor: index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor }}></div>
              <p className="status-bar__text">&nbsp;{index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor}</p>
              <p className="status-bar__text">&nbsp;{(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor) && rgbToXyz(extractRGB(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor))}</p>
              <p className="status-bar__text">&nbsp;{(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor) && rgbToLab(extractRGB(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor))}</p>
              {index < 2 && <p className="status-bar__text">&nbsp;({imageCoordinates[index === 0 ? "base" : "extra"].x.toFixed(0)}, {imageCoordinates[index === 0 ? "base" : "extra"].y.toFixed(0)})</p>}
            </div>
          ))}
          <p className="editor__contrast-info">
            Контраст {pipetteColor1 && pipetteColor2 && calculateContrast(extractRGB(pipetteColor1), extractRGB(pipetteColor2))}
          </p>
        </div>
      </ContextModal>
      <div className={`editor__workspace workspace${toolActive === "hand" ? " workspace--hand" : ""}`}>
        <canvas
          className={`workspace__canvas${toolActive === "pipette" ? " workspace__canvas--pipette" : ""}`}
          ref={canvas}
          onClick={(e) => {
            if (toolActive === "pipette") {
              handleCanvasClick(e);
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDownEvent}
          onMouseUp={handleMouseUpEvent}
          onKeyDown={!isModalOpen ? handleKeyDownEvent : null}
          onKeyUp={!isModalOpen ? handleKeyUpEvent : null}
          style={{ cursor: toolActive === "hand" ? "grab" : toolActive === "pipette" ? "crosshair" : "default" }}
        />
      </div>
      <div className="editor__status-bar status-bar">
        {image && (
          <>
            <span className="status-bar__text">Разрешение: {Math.round(dimensions.width)}&nbsp;x&nbsp;{Math.round(dimensions.height)}&nbsp;px</span>
            <span className="status-bar__text">Размер файла: {fileSize}&nbsp;Кб</span>
            <span className="status-bar__text">Координаты: x&nbsp;{cursor.x}; y&nbsp;{cursor.y}</span>
          </>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Масштабирование изображения">
        <ScalingModal image={imageObj} setImage={updateImage} closeModal={closeModal} />
      </Modal>
      <Modal w80 bg0={showBg} isOpen={isModalCurvesOpen} onClose={closeModal} title="Кривые изображения">
        {isModalCurvesOpen && <CurvesModal imageCtx={context} setImage={updateImage} closeModal={closeModal} showPreview={showPreview} />}
      </Modal>
      <Modal bg0={showBg} isOpen={isModalFilterOpen} onClose={closeModal} title="Фильтрация изображения">
        {isModalFilterOpen && <FilterModal imageCtx={context} setImage={updateImage} closeModal={closeModal} showPreview={showPreview} />}
      </Modal>
    </section>
  );
};

export default Editor;
