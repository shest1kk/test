import React, { useRef, useContext, useState, useEffect } from 'react';
import { ImageContext } from '@/ImageProvider';
import TheButton from '@components/Button/TheButton';
import { Link } from 'react-router-dom'; // Импортируем Link для навигации
import Loader from '@components/Loader/Loader';
import './StartPage.css';

// Компонент StartPage для загрузки и отображения изображения
const StartPage = () => {
    // Получение состояния изображения и функции для его обновления из контекста
    const { image, setImage } = useContext(ImageContext);
    // Ссылка на элемент input для загрузки файла
    const inputFile = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Имитация загрузки
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500); // Задержка в 1.5 секунды

        return () => clearTimeout(timer);
    }, []);

    // Функция для обработки нажатия кнопки загрузки изображения
    const handleButtonClick = () => inputFile.current.click();

    // Функция для обработки изменения изображения
    const handleImageChange = (event) => {
        const file = event.target.files?.[0]; // Получение загруженного файла
        if (file) {
            const reader = new FileReader(); // Создание объекта FileReader для чтения файла
            reader.onload = (e) => setImage(e.target.result); // Установка изображения в состояние после загрузки
            reader.readAsDataURL(file); // Чтение файла как Data URL
        }
    };

    // Функция для обработки вставки изображения (CTRL+V)
    const handlePaste = (event) => {
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (e) => setImage(e.target.result);
                reader.readAsDataURL(file);
            }
        }
    };

    // Функция для обработки перетаскивания изображения
    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // Функция для обработки вставки изображения (CTRL+V) с заменой
    const handlePasteReplace = (event) => {
        handlePaste(event); // Обрабатываем вставку независимо от того, загружено ли изображение
    };

    return (
        <>
            {isLoading ? (
                <Loader />
            ) : (
                <section className="home" id="wrapper" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onPaste={handlePasteReplace} style={{ height: '100vh', overflow: 'hidden' }}>
                    <h1 className="home__title">ОБРАБОТКА ИЗОБРАЖЕНИЙ</h1>
                    <div className="home__head">
                        <p>Привет! Этот сервис предназначен для обработки изображений.</p>
                        <p>Ты можешь загрузить изображение по кнопке ниже, или просто перетащить сюда изображение / вставить его (CTRL+V).</p>
                    </div>
                    {/* Скрытый input для загрузки изображения */}
                    <input ref={inputFile} style={{ display: 'none' }} type="file" accept="image/*" onChange={handleImageChange} />
                    <div className="home__actions">
                        <div className="home__load-buttons" style={{ width: image ? 'auto' : '100%' }}>
                            {/* Кнопка для загрузки изображения */}
                            <TheButton onClick={handleButtonClick} title="Загрузка изображения с компьютера" normal style={{ width: '100%' }}>
                                {image ? "Загрузить другое изображение" : "Загрузить изображение"}
                            </TheButton>
                            {/* Кнопка для перехода в редактор с использованием Link */}
                            {image && (
                                <Link to={{ pathname: '/editor', state: { imageData: image } }} style={{ width: '100%' }}>
                                    <TheButton accent style={{ width: '100%' }}>Перейти в редактор</TheButton>
                                </Link>
                            )}
                        </div>
                    </div>
                    {image && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: '20px' }}>
                            {/* Предпросмотр загруженного изображения */}
                            <img className="preview" src={image} alt="Uploaded" />
                        </div>
                    )}
                </section>
            )}
        </>
    );
}

export default StartPage;
