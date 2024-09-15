import React, { useState, useEffect, useContext } from 'react';
import './ScalingModal.css';
import PropTypes from 'prop-types';
import Dropdown from '@components/Dropdown/Dropdown';
import Input from '@components/Input/Input';
import TheButton from '@components/Button/TheButton';
import { ImageContext } from '@/ImageProvider';
import nearestNeighborInterpolation from '@utils/ImageProcessing/NearestNeighborInterpolation';
import { bilinearInterpolation, bicubicInterpolation } from '@utils/ImageProcessing/InterpolationMethods';

const ScalingModal = ({ image, closeModal }) => {
    const { setImage } = useContext(ImageContext);
    const [resizeMode, setResizeMode] = useState(() => localStorage.getItem('resizeMode') || 'Проценты');
    const [width, setWidth] = useState('100');
    const [height, setHeight] = useState('100');
    const [lockAspectRatio, setLockAspectRatio] = useState(() => JSON.parse(localStorage.getItem('lockAspectRatio')) || true);
    const [aspectRatio, setAspectRatio] = useState(0);
    const [interpolationAlgorithm, setInterpolationAlgorithm] = useState(() => localStorage.getItem('interpolationAlgorithm') || 'Ближайший сосед');
    const [initialPixels, setInitialPixels] = useState(0);
    const [resizedPixels, setResizedPixels] = useState(0);
    const [widthError, setWidthError] = useState('');
    const [heightError, setHeightError] = useState('');

    useEffect(() => {
        if (!image) return;
        const initialMPx = (image.width * image.height / 1000000).toFixed(2);
        setInitialPixels(initialMPx);
        setResizedPixels(initialMPx);
        setAspectRatio(image.width / image.height);

        if (resizeMode === 'Проценты') {
            setWidth('100');
            setHeight('100');
        } else {
            setWidth(image.width.toString());
            setHeight(image.height.toString());
        }
    }, [image, resizeMode])

    useEffect(() => {
        if (!Number.isInteger(Number(height)) || Number(height) <= 0) {
            setHeightError('⚠ Высота должна быть целым положительным числом');
        } else {
            setHeightError('');
        }
        if (!Number.isInteger(Number(width)) || Number(width) <= 0) {
            setWidthError('⚠ Ширина должна быть целым положительным числом');
        } else {
            setWidthError('');
        }
    }, [height, width])

    const handleWidthChange = (value) => {
        setWidth(value);
        if (lockAspectRatio) {
            const newHeight = resizeMode === 'Проценты' ? value : Math.round(value / aspectRatio);
            setHeight(newHeight.toString());
        }
        updateResizedPixels(value, height);
    };

    const handleHeightChange = (value) => {
        setHeight(value);
        if (lockAspectRatio) {
            const newWidth = resizeMode === 'Проценты' ? value : Math.round(value * aspectRatio);
            setWidth(newWidth.toString());
        }
        updateResizedPixels(width, value);
    };

    const updateResizedPixels = (widthValue, heightValue) => {
        const newWidthValue = Number(widthValue);
        const newHeightValue = Number(heightValue);
        if (resizeMode === 'Проценты') {
            setResizedPixels(((image.width * image.height * newWidthValue * newHeightValue) / 1000000).toFixed(2));
        } else {
            setResizedPixels(((newWidthValue * newHeightValue) / 1000000).toFixed(2));
        }
    };

    const handleResizeConfirm = () => {
        localStorage.setItem('resizeMode', resizeMode);
        localStorage.setItem('width', width);
        localStorage.setItem('height', height);
        localStorage.setItem('lockAspectRatio', JSON.stringify(lockAspectRatio));
        localStorage.setItem('interpolationAlgorithm', interpolationAlgorithm);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const newWidth = resizeMode === 'Проценты' ? Math.round((image.width * Number(width)) / 100) : Number(width);
        const newHeight = resizeMode === 'Проценты' ? Math.round((image.height * Number(height)) / 100) : Number(height);
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        
        let resizedImageData;
        switch (interpolationAlgorithm) {
            case 'Ближайший сосед':
                resizedImageData = nearestNeighborInterpolation(imageData, newWidth, newHeight);
                break;
            case 'Билинейный':
                resizedImageData = bilinearInterpolation(imageData, newWidth, newHeight);
                break;
            case 'Бикубический':
                resizedImageData = bicubicInterpolation(imageData, newWidth, newHeight);
                break;
            default:
                resizedImageData = imageData;
        }
        
        ctx.putImageData(resizedImageData, 0, 0);
        
        setImage(canvas.toDataURL('image/png'));
        closeModal();
    };

    const handleResizeModeChange = (selectedOption) => {
        setResizeMode(selectedOption);
        if (selectedOption === 'Проценты') {
            setWidth('100');
            setHeight('100');
        } else {
            setWidth(image.width.toString());
            setHeight(image.height.toString());
        }
    };

    const handleInterpolationAlgorithmChange = (selectedOption) => {
        setInterpolationAlgorithm(selectedOption);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
    }

    return (
        <form className="scaling-modal" onSubmit={handleSubmit}>
            <p className="form__text">
                Размер исходного изображения: {initialPixels} MPx
            </p>
            <p className="form__text">
                Размер после изменений: {resizedPixels} MPx
            </p>
            <h3 className="form__name">Настройка размеров</h3>
            <div className="form__settings">
                <label className="form__label" htmlFor="resize-mode">Единицы измерения</label>
                <Dropdown id="resize-mode" options={["Проценты", "Пиксели"]} onSelect={handleResizeModeChange} selectOption={resizeMode} />
                <label className="form__label" htmlFor="width">Ширина</label>
                <Input
                    type="number"
                    id="width"
                    value={width}
                    onChange={handleWidthChange}
                    min={1}
                    step={1}
                />
                <label className="form__label" htmlFor="height">Высота</label>
                <Input
                    type="number"
                    id="height"
                    value={height}
                    onChange={handleHeightChange}
                    min={1}
                    step={1}
                />
                <div className="form__lock">
                    <svg className="form__lock-line" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 4.5">
                        <line className="lock" y1="0.5" x2="16.5" y2="0.5"></line>
                        <line className="lock" x1="16.5" x2="16.5" y2="4.5"></line>
                    </svg>
                    <button className="form__lock-button" onClick={() => setLockAspectRatio(!lockAspectRatio)}>
                        {lockAspectRatio
                            ? <svg role="img" fill="currentColor" viewBox="0 0 18 18" id="SLockClosed18N-icon" width="18" height="18" aria-hidden="true" aria-label="" focusable="false"><path fillRule="evenodd" d="M14.5,8H14V7A5,5,0,0,0,4,7V8H3.5a.5.5,0,0,0-.5.5v8a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5v-8A.5.5,0,0,0,14.5,8ZM6,7a3,3,0,0,1,6,0V8H6Zm4,6.111V14.5a.5.5,0,0,1-.5.5h-1a.5.5,0,0,1-.5-.5V13.111a1.5,1.5,0,1,1,2,0Z"></path></svg>
                            : <svg role="img" fill="currentColor" viewBox="0 0 18 18" id="SLockOpen18N-icon" width="18" height="18" aria-hidden="true" aria-label="" focusable="false"><path fillRule="evenodd" d="M14.5,8H5.95V5.176A3.106,3.106,0,0,1,9,2a3.071,3.071,0,0,1,2.754,1.709c.155.32.133.573.389.573a.237.237,0,0,0,.093-.018l1.34-.534a.256.256,0,0,0,.161-.236C13.737,2.756,12.083.1,9,.1A5.129,5.129,0,0,0,4,5.146V8H3.5a.5.5,0,0,0-.5.5v8a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5v-8A.5.5,0,0,0,14.5,8ZM10,13.111V14.5a.5.5,0,0,1-.5.5h-1a.5.5,0,0,1-.5-.5V13.111a1.5,1.5,0,1,1,2,0Z"></path></svg>
                        }
                    </button>
                    <svg className="form__lock-line" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 7">
                        <line className="lock" y1="4.5" x2="17" y2="4.5"></line>
                        <line className="lock" x1="16.5" x2="16.5" y2="4.5"></line>
                    </svg>
                </div>
                <label className="form__label" htmlFor="interpolation-algorithm">Алгоритм интерполяции</label>
                <div className="form__select-iterpolation">
                    <Dropdown id="interpolation-algorithm" options={["Ближайший сосед", "Билинейный", "Бикубический"]} onSelect={handleInterpolationAlgorithmChange} selectOption={interpolationAlgorithm} />
                    <span
                        className="tooltip"
                        data-tooltip={
                            interpolationAlgorithm === "Ближайший сосед" 
                                ? "Алгоритм ближайшего соседа берет значение цвета ближайшего пикселя исходного изображения для каждого пикселя в новом изображении. Это простой и быстрый алгоритм, но может приводить к появлению пикселизации при значительном изменении размера."
                                : interpolationAlgorithm === "Билинейный"
                                ? "Билинейная интерполяция использует взвешенное среднее четырех ближайших пикселей для определения цвета нового пикселя. Этот метод обеспечивает более гладкий результат по сравнению с методом ближайшего соседа."
                                : "Бикубическая интерполяция использует взвешенное среднее шестнадцати ближайших пикселей для определения цвета нового пикселя. Этот метод обеспечивает наиболее гладкий результат из трех, но требует больше вычислений."
                        }
                    >
                        &#9432;
                    </span>
                </div>
            </div>
            <div className="form__errors">
                {widthError && <p className="form__error">{widthError}</p>}
                {heightError && <p className="form__error">{heightError}</p>}
            </div>
            <TheButton className="form__button" accent={true} onClick={handleResizeConfirm}>
                Выполнить
            </TheButton>
        </form>
    );
};

ScalingModal.propTypes = {
    image: PropTypes.object,
    closeModal: PropTypes.func,
};

export default ScalingModal;