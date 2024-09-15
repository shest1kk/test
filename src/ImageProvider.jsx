// Импорт необходимых библиотек и модулей
import React, { createContext, useState } from 'react';
import PropTypes from 'prop-types';

// Создание контекста для управления изображениями
export const ImageContext = createContext();

// Компонент ImageProvider для управления состоянием изображения
export const ImageProvider = ({ children }) => {
  // Состояние для хранения текущего изображения
  const [image, setImage] = useState(null);

  // Функция для обновления состояния изображения
  const updateImage = (newImage) => {
    setImage(newImage);
  };

  // Предоставление состояния изображения и функции обновления контексту
  return (
    <ImageContext.Provider value={{ image, setImage: updateImage }}>
      {children}
    </ImageContext.Provider>
  );
};

// Определение типов пропсов для компонента ImageProvider
ImageProvider.propTypes = {
  children: PropTypes.node, // Дочерние компоненты, которые будут обернуты провайдером
};