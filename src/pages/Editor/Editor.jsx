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

import { Menu, MenuItem } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import { calculateFileSize } from "@utils/FileSize/fileSize";
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

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

  const [isDarkMode, setIsDarkMode] = useState(false);  // Changed to false for light mode by default

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [imageCoords, setImageCoords] = useState({ x: null, y: null });

  const [isMouseWheelDown, setIsMouseWheelDown] = useState(false);
  const [previousTool, setPreviousTool] = useState("cursor");

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Эффект для загрузки сохраненной темы из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(false);  // Устанавливаем false вместо проверки системных настроек
      localStorage.setItem('theme', 'light');  // Сохраняем светлую тему по умолчанию
    }
  }, []);

  // Эффект для применения темы к body и сохранения ее в localStorage
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Функция для переключения между светлой и темной темами
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

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

  // Эффект для обработки загрузки изображения и настройки холста
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
      const newScaleFactor = Math.min(widthScale, heightScale) * 100;
      
      if (scaleFactor === 0) {
        setScaleFactor(newScaleFactor);
      }

      const scaledWidth = img.width * (scaleFactor / 100);
      const scaledHeight = img.height * (scaleFactor / 100);

      const canvasElement = canvas.current;
      if (!canvasElement) return;

      context.current = canvasElement.getContext("2d");
      context.current.imageSmoothingEnabled = true;

      canvasElement.width = workspaceWidth;
      canvasElement.height = workspaceHeight;

      const drawImage = () => {
        context.current.clearRect(0, 0, canvasElement.width, canvasElement.height);
        context.current.drawImage(
          img,
          canvasTranslation.x + (maxWidth - scaledWidth) / 2 + 50,
          canvasTranslation.y + (maxHeight - scaledHeight) / 2 + 50,
          scaledWidth,
          scaledHeight
        );
        requestAnimationFrame(drawImage);
      };

      drawImage();

      setDimensions({ width: scaledWidth, height: scaledHeight });
      calculateFileSize(img.src).then(size => setFileSize(formatFileSize(size)));

      // Обработчик события колесика мыши для масштабирования
      const handleWheel = (event) => {
        event.preventDefault();
        const delta = event.deltaY;
        const scaleSteps = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300];
        const currentIndex = scaleSteps.indexOf(scaleFactor);
        let newIndex = currentIndex;

        if (delta < 0) { // Изменение направления для увеличения
          newIndex = Math.min(currentIndex + 1, scaleSteps.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        setScaleFactor(scaleSteps[newIndex]);
      };

      // Обработчик события касания для масштабирования на мобильных устройствах
      const handleTouchZoom = (event) => {
        if (event.touches.length === 2) {
          const touch1 = event.touches[1];
          const touch2 = event.touches[0];
          const distance = Math.sqrt(
            (touch1.clientX - touch2.clientX) ** 2 +
            (touch1.clientY - touch2.clientY) ** 2
          );
          const newScaleFactor = Math.max(10, Math.min(300, 200 / distance)); // Настройка коэффициента масштабирования на основе расстояния
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

  // Функция для обработки движения мыши
  const handleMouseMove = useCallback((e) => {
    const canvasElement = canvas.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCursor({ x, y });

    // Calculate image position and dimensions
    const imageWidth = dimensions.width * (scaleFactor / 100);
    const imageHeight = dimensions.height * (scaleFactor / 100);
    const imageX = (rect.width - imageWidth) / 2 + canvasTranslation.x;
    const imageY = (rect.height - imageHeight) / 2 + canvasTranslation.y;

    // Check if cursor is over the image
    if (x >= imageX && x <= imageX + imageWidth && y >= imageY && y <= imageY + imageHeight) {
      const imageRelativeX = Math.round((x - imageX) * (dimensions.width / imageWidth));
      const imageRelativeY = Math.round((y - imageY) * (dimensions.height / imageHeight));
      setImageCoords({ x: imageRelativeX, y: imageRelativeY });

      // Add color picking logic when the pipette tool is active
      if (toolActive === "pipette") {
        const ctx = canvasElement.getContext('2d');
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        const color = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
        setCurrentColor(color);
      }
    } else {
      setImageCoords({ x: null, y: null });
    }

    if (isDragging && (toolActive === "hand" || isMouseWheelDown)) {
      const dx = e.clientX - rect.left - cursor.x;
      const dy = e.clientY - rect.top - cursor.y;
      updateTranslation(animationFrameId, canvasTranslation, setCanvasTranslation, dx, dy, dimensions.width, dimensions.height, scaleFactor);
    }
  }, [isDragging, toolActive, isMouseWheelDown, cursor.x, cursor.y, canvasTranslation, dimensions.width, dimensions.height, scaleFactor]);

  const handleKeyDownEvent = (e) => handleKeyDown(toolActive, canvasTranslation, setCanvasTranslation, e);
  const handleKeyUpEvent = (e) => handleKeyUp(toolActive, canvasTranslation, setCanvasTranslation, e);
  const handleMouseUpEvent = (e) => {
    if (e.button === 1) { // Middle mouse button
      handleMouseWheelUp(e);
    } else {
      handleMouseUp(setIsDragging);
      setIsMouseDown(false);
    }
  };
  const handleMouseDownEvent = (e) => {
    setIsMouseDown(true);
    if (e.button === 1) { // Middle mouse button
      handleMouseWheelDown(e);
    } else if (selectedTool === "hand") {
      setIsDragging(true);
    }
  };

  const handleMouseWheelDown = (e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault(); // Prevent default scrolling behavior
      setIsMouseWheelDown(true);
      setPreviousTool(toolActive);
      setToolActive("hand");
      setIsDragging(true);
    }
  };

  const handleMouseWheelUp = (e) => {
    if (e.button === 1) { // Middle mouse button
      setIsMouseWheelDown(false);
      setToolActive(previousTool);
      setIsDragging(false);
    }
  };

  // Эффект для добавления обработчиков событий клавиатуры
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
      canvasElement.addEventListener("mousedown", handleMouseDownEvent);
      canvasElement.addEventListener("mouseup", handleMouseUpEvent);
      canvasElement.addEventListener("mouseleave", handleMouseUpEvent);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDownShortcut);
      if (canvasElement) {
        canvasElement.removeEventListener("mousedown", handleMouseDownEvent);
        canvasElement.removeEventListener("mouseup", handleMouseUpEvent);
        canvasElement.removeEventListener("mouseleave", handleMouseUpEvent);
      }
    };
  }, [selectedTool]);

  const handleExportClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = (format) => {
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
      const url = canvasRef.toDataURL(format === 'JPG' ? 'image/jpeg' : 'image/png');
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.href = url;
      a.download = `editedImage.${format.toLowerCase()}`;
      a.click();
      document.body.removeChild(a);
    };
    handleClose();
  };

  const handleTelegramShare = () => {
    const canvasRef = canvas.current;
    if (!canvasRef) return;

    canvasRef.toBlob((blob) => {
      const file = new File([blob], "image.png", { type: "image/png" });
      
      // Create a temporary URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Construct the Telegram share URL
      const telegramUrl = `tg://msg_ext_share_url?url=${encodeURIComponent(fileUrl)}`;
      
      // Try to open the Telegram app
      window.location.href = telegramUrl;
      
      // If the Telegram app doesn't open after a short delay, fall back to web version
      setTimeout(() => {
        const webTelegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fileUrl)}`;
        window.open(webTelegramUrl, '_blank');
      }, 500);

      // Clean up the temporary URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000); // Clean up after 1 minute
    }, 'image/png');
    
    handleClose();
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

  const addToHistory = (newImage) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImage);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setImage(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setImage(history[historyIndex + 1]);
    }
  };

  useEffect(() => {
    if (image && (history.length === 0 || image !== history[historyIndex])) {
      addToHistory(image);
    }
  }, [image]);

  const updateImage = (newImage, newFileSize) => {
    console.log(newImage);
    setImage(newImage);
    setFileSize(formatFileSize(newFileSize));
    localStorage.setItem('lastEditedImage', newImage);
    addToHistory(newImage);
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
    <section className={`editor ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="editor__menu-bar menu-bar">
        <div className="menu-bar__actions">
          <ButtonIcon link="/" onClick={() => localStorage.removeItem('lastEditedImage')}>Главная</ButtonIcon>
          {image && (
            <>
              
              <ButtonIcon title="Экспорт" onClick={handleExportClick}>Экспорт</ButtonIcon>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
              >
                <MenuItem onClick={() => handleDownload('PNG')}>PNG</MenuItem>
                <MenuItem onClick={() => handleDownload('JPG')}>JPG</MenuItem>
                <MenuItem onClick={handleTelegramShare}>
                  <TelegramIcon style={{ marginRight: '8px' }} />
                  Telegram
                </MenuItem>
              </Menu>
              <ButtonIcon title="Масштабирование" onClick={openModal}>Масштабировать</ButtonIcon>
              <ButtonIcon title="Кривые" onClick={openCurvesModal}>Кривые</ButtonIcon>
              <ButtonIcon title="Фильтрация" onClick={openFilterModal}>Фильтрация</ButtonIcon>
              <ButtonIcon title="Отменить" onClick={undo} disabled={historyIndex <= 0}>
                <UndoIcon />
              </ButtonIcon>
              <ButtonIcon title="Повторить" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <RedoIcon />
              </ButtonIcon>
            </>
          )}
          <ButtonIcon title={isDarkMode ? "Светлая тема" : "Темная тема"} onClick={toggleTheme}>
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </ButtonIcon>
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
            active={selectedTool === tool || (isMouseWheelDown && tool === "hand")}
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
              {/* <p className="status-bar__text">&nbsp;{(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor) && rgbToLab(extractRGB(index === 0 ? pipetteColor1 : index === 1 ? pipetteColor2 : currentColor))}</p> */}
              {index < 2 && <p className="status-bar__text">&nbsp;({imageCoordinates[index === 0 ? "base" : "extra"].x.toFixed(0)}, {imageCoordinates[index === 0 ? "base" : "extra"].y.toFixed(0)})</p>}
            </div>
          ))}
          <p className="editor__contrast-info">
            Контраст {pipetteColor1 && pipetteColor2 && calculateContrast(extractRGB(pipetteColor1), extractRGB(pipetteColor2))}
          </p>
        </div>
      </ContextModal>
      <div className={`editor__workspace workspace${toolActive === "hand" || isMouseWheelDown ? " workspace--hand" : ""}`}>
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
          style={{ cursor: toolActive === "hand" || isMouseWheelDown ? "grab" : toolActive === "pipette" ? "crosshair" : "default" }}
        />
      </div>
      <div className="editor__status-bar status-bar">
        {image && (
          <>
            <span className="status-bar__text">Разрешение: {Math.round(dimensions.width)}&nbsp;x&nbsp;{Math.round(dimensions.height)}&nbsp;px</span>
            <span className="status-bar__text">Размер файла: {fileSize}</span>
            <span className="status-bar__text">
              Координаты: 
              {imageCoords.x !== null && imageCoords.y !== null
                ? `x ${imageCoords.x}; y ${imageCoords.y}`
                : "вне изображения"
              }
            </span>
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