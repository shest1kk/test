import React from 'react';
import ButtonIcon from "@components/ButtonIcon/ButtonIcon";
import { Menu, MenuItem } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

const MenuBar = ({ 
  isDarkMode, 
  toggleTheme, 
  image, 
  handleExportClick, 
  anchorEl, 
  open, 
  handleClose, 
  handleDownload, 
  handleTelegramShare,
  openModal,
  openCurvesModal,
  openFilterModal,
  undo,
  redo,
  historyIndex,
  history
}) => {
  return (
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
    </div>
  );
};

export default MenuBar;