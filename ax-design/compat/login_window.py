# === AXIOM_PY_HEADER ===
# FILE: login_window.py
# TITLE: LOGIN WINDOW MODULE (compact, PyQt5-stable)
# VERSION: v0.9
# STATUS: STABLE
# ZONE: [11_SYSTEM_INTERFACE]
# COMMENT: Модальное окно логина с аккуратной карточкой; HiDPI‑safe; тень на карточке; без QGraphicsOpacityEffect.
# AUTHOR: CREATOR & AXIOM
# DATE: 2025-08-20
# === CHANGELOG ===
# v0.9 — 2025-08-20 — FIX: убран QGraphicsOpacityEffect (fade теперь через windowOpacity);
#                      устраняет спам «QPainter::... not active» и пустой контент.
# v0.8 — 2025-08-20 — Тень перенесена на card (устранены артефакты при HiDPI).
# v0.7 — 2025-08-19 — Компактный размер окна, динамическая ширина карточки, улучшенный QSS‑хук.
# v0.6 — 2025-08-16 — Центрирование и защита размеров.
# =======================

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Optional, Dict

from ui.style_loader import apply_style_to_widget

from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve, pyqtSlot, QPoint, QSize
from PyQt5.QtGui import QColor, QKeySequence
from PyQt5.QtWidgets import (
    QApplication, QDialog, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QFrame, QLabel, QLineEdit, QPushButton, QShortcut,
    QGraphicsDropShadowEffect, QSizePolicy
)

# ─────────────────────────────────────────────────────────────────────────────
# Viktor seal (фолбэк, если виджета нет в репо)
# ─────────────────────────────────────────────────────────────────────────────
try:
    from ui.widgets.viktor_seal import ViktorSealWidget  # type: ignore
except Exception:  # pragma: no cover
    class ViktorSealWidget(QWidget):
        def __init__(self, *a, **kw):
            super().__init__(*a, **kw)
            self.setMinimumSize(88, 88)
            self.setObjectName("AxiomSealFallback")


# ─────────────────────────────────────────────────────────────────────────────
# Кастомный тайтл‑бар (минималистичный)
# ─────────────────────────────────────────────────────────────────────────────
class TitleBar(QWidget):
    def __init__(self, parent: QDialog):
        super().__init__(parent)
        self._drag_pos: Optional[QPoint] = None
        self.setObjectName("AxiomTitleBar")
        self.setAttribute(Qt.WA_StyledBackground, True)

        lay = QHBoxLayout(self)
        lay.setContentsMargins(12, 10, 12, 6)
        lay.setSpacing(8)

        self.icon = QLabel("Σ", self)
        self.icon.setObjectName("AxiomTBIcon")
        self.title = QLabel("AXIOM PANEL — Login", self)
        self.title.setObjectName("AxiomTBTitle")
        lay.addWidget(self.icon)
        lay.addWidget(self.title)
        lay.addStretch(1)

        self.btn_min = QPushButton("–", self)
        self.btn_min.setObjectName("TBMin")
        self.btn_min.setFixedSize(28, 22)
        self.btn_min.setCursor(Qt.PointingHandCursor)
        self.btn_min.setFlat(True)

        self.btn_close = QPushButton("×", self)
        self.btn_close.setObjectName("TBClose")
        self.btn_close.setFixedSize(28, 22)
        self.btn_close.setCursor(Qt.PointingHandCursor)
        self.btn_close.setFlat(True)

        lay.addWidget(self.btn_min)
        lay.addWidget(self.btn_close)

        self.btn_min.clicked.connect(parent.showMinimized)
        self.btn_close.clicked.connect(parent.reject)

    # Перетаскивание безрамочного окна
    def mousePressEvent(self, e):
        if e.button() == Qt.LeftButton:
            self._drag_pos = e.globalPos() - self.window().frameGeometry().topLeft()
            e.accept()

    def mouseMoveEvent(self, e):
        if e.buttons() & Qt.LeftButton and self._drag_pos is not None:
            self.window().move(e.globalPos() - self._drag_pos)
            e.accept()

    def mouseDoubleClickEvent(self, e):
        self.window().showMinimized()


# ─────────────────────────────────────────────────────────────────────────────
# Авторизация
# ─────────────────────────────────────────────────────────────────────────────
class AuthManager:
    def __init__(self, auth_file: Path):
        self.path = auth_file
        self.users: Dict[str, str] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            for u in data.get("users", []):
                login = str(u.get("login", "")).strip()
                pw = str(u.get("password_hash", "")).strip()
                if login and pw:
                    self.users[login] = pw
        except Exception:
            self.users = {}

    @staticmethod
    def sha256(s: str) -> str:
        return hashlib.sha256(s.encode()).hexdigest()

    def verify(self, login: str, password: str) -> bool:
        if not login or not password:
            return False
        return self.users.get(login, "") == self.sha256(password)


# ─────────────────────────────────────────────────────────────────────────────
# Окно логина (компактное, не фуллскрин)
# ─────────────────────────────────────────────────────────────────────────────
class LoginWindow(QDialog):
    """Frameless modal dialog со стабильной версткой.

    PyQt5‑совместимость:
    - использовать QDialog.exec_() и QDialog.Accepted в вызывающем коде
    - корректные QShortcut через QKeySequence
    - центрирование и запрет на авто‑максимизацию
    """

    DEF_WIDTH = 920
    DEF_HEIGHT = 620

    def __init__(self, qss_path: Optional[str] = None, parent: Optional[QWidget] = None):
        super().__init__(parent)
        # Безрамочное окно + прозрачный фон (радиусы рисуем стилями)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Dialog)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WA_StyledBackground, True)  # позволяет QSS рисовать фон у диалога
        self.setModal(True)
        self.setObjectName("AxiomLoginWindow")

        # Компактная динамическая геометрия (уменьшаем размер окна).
        scale_factor: float = 0.6
        width: int = int(self.DEF_WIDTH * scale_factor)
        height: int = int(self.DEF_HEIGHT * scale_factor)
        try:
            screen = self.screen() or (self.windowHandle().screen() if self.windowHandle() else None)
            if screen is None:
                screen = QApplication.primaryScreen()
            if screen:
                avail = screen.availableGeometry()
                if avail.width() < width:
                    width = int(avail.width() * 0.9)
                if avail.height() < height:
                    height = int(avail.height() * 0.9)
        except Exception:
            pass
        self.setFixedSize(QSize(width, height))

        base = Path(__file__).resolve().parent
        self.auth = AuthManager(base / "users" / "auth.json")
        self._qss_path = qss_path

        self._build_ui()
        self._wire_shortcuts()
        self._animate_in()
        self._apply_theme_once()

    # UI ---------------------------------------------------------------------
    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        self.window_frame = QFrame(self)
        self.window_frame.setObjectName("AxiomWindowFrame")
        self.window_frame.setAttribute(Qt.WA_StyledBackground, True)
        self.window_frame.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        outer.addWidget(self.window_frame)

        root = QVBoxLayout(self.window_frame)
        root.setContentsMargins(18, 14, 18, 18)
        root.setSpacing(0)

        # Заголовок
        self.titlebar = TitleBar(self)
        root.addWidget(self.titlebar)

        # Центрирование карточки
        center_wrap = QHBoxLayout()
        center_wrap.setSpacing(0)
        root.addStretch(1)
        root.addLayout(center_wrap)
        root.addStretch(1)

        # Карточка авторизации
        card = QFrame(self.window_frame)
        card.setObjectName("AxiomCard")
        card.setAttribute(Qt.WA_StyledBackground, True)
        card.setFrameShape(QFrame.NoFrame)
        try:
            window_width = self.width()
            min_w = int(window_width * 0.80)
            max_w = int(window_width * 0.88)
            card.setMinimumWidth(min_w)
            card.setMaximumWidth(max_w)
        except Exception:
            card.setMinimumWidth(460)
            card.setMaximumWidth(640)

        card_l = QVBoxLayout(card)
        card_l.setContentsMargins(26, 26, 24, 24)
        card_l.setSpacing(10)

        center_wrap.addStretch(1)
        center_wrap.addWidget(card)
        center_wrap.addStretch(1)

        # Тень только на карточке (без эффектов на окне/рамке)
        card_shadow = QGraphicsDropShadowEffect(card)
        card_shadow.setBlurRadius(48)
        card_shadow.setXOffset(0)
        card_shadow.setYOffset(10)
        card_shadow.setColor(QColor(0, 0, 0, 180))
        card.setGraphicsEffect(card_shadow)

        # Seal
        self.seal = ViktorSealWidget(card)
        self.seal.setObjectName("AxiomSeal")
        self.seal.setFixedSize(92, 92)
        card_l.addWidget(self.seal, alignment=Qt.AlignHCenter)

        # Заголовки
        self.label_title = QLabel("WELCOME TO AXIOM PANEL", card)
        self.label_title.setObjectName("AxiomTitle")
        self.label_title.setAlignment(Qt.AlignCenter)
        card_l.addWidget(self.label_title)

        self.label_subtitle = QLabel("ACCESS TO SYSTEM CORE // PROTOCOL: RED", card)
        self.label_subtitle.setObjectName("AxiomSubtitle")
        self.label_subtitle.setAlignment(Qt.AlignCenter)
        card_l.addWidget(self.label_subtitle)

        # Делитель
        div = QFrame(card)
        div.setObjectName("AxiomDivider")
        div.setFrameShape(QFrame.HLine)
        div.setFrameShadow(QFrame.Plain)
        card_l.addWidget(div)

        # Поля
        form = QGridLayout()
        form.setHorizontalSpacing(10)
        form.setVerticalSpacing(10)
        card_l.addLayout(form)

        self.edit_user = QLineEdit(card)
        self.edit_user.setObjectName("UserField")
        self.edit_user.setPlaceholderText("USER ID")
        self.edit_user.setClearButtonEnabled(True)

        self.edit_pass = QLineEdit(card)
        self.edit_pass.setObjectName("PassField")
        self.edit_pass.setPlaceholderText("ACCESS KEY")
        self.edit_pass.setEchoMode(QLineEdit.Password)
        self.edit_pass.setClearButtonEnabled(True)

        form.addWidget(self.edit_user, 0, 0)
        form.addWidget(self.edit_pass, 1, 0)

        # Ошибка
        self.error = QLabel("", card)
        self.error.setObjectName("AxiomError")
        card_l.addWidget(self.error)

        # Кнопка
        self.btn_login = QPushButton("ENTRANCE", card)
        self.btn_login.setObjectName("LoginButton")
        self.btn_login.setDefault(True)
        self.btn_login.setCursor(Qt.PointingHandCursor)
        self.btn_login.clicked.connect(self.attempt_login)
        card_l.addWidget(self.btn_login)

        # Футер
        self.footer = QLabel("AXIOM DESIGN © 2025 • RED PROTOCOL", card)
        self.footer.setObjectName("AxiomFooter")
        self.footer.setAlignment(Qt.AlignRight)
        card_l.addWidget(self.footer)

        # Очистка подсветки ошибки при вводе
        self.edit_user.textEdited.connect(self._clear_error_state)
        self.edit_pass.textEdited.connect(self._clear_error_state)

    # Взаимодействия ---------------------------------------------------------
    def _wire_shortcuts(self) -> None:
        self.edit_user.returnPressed.connect(self.btn_login.click)
        self.edit_pass.returnPressed.connect(self.btn_login.click)
        esc = QShortcut(QKeySequence(Qt.Key_Escape), self)
        esc.activated.connect(self.reject)

    def _animate_in(self) -> None:
        # Fade без QGraphicsOpacityEffect (безопасно для WA_TranslucentBackground)
        self.setWindowOpacity(0.0)
        anim = QPropertyAnimation(self, b"windowOpacity", self)
        anim.setDuration(260)
        anim.setStartValue(0.0)
        anim.setEndValue(1.0)
        anim.setEasingCurve(QEasingCurve.InOutCubic)
        anim.start(QPropertyAnimation.DeleteWhenStopped)
        self._fade_anim = anim

    def center_on_screen(self) -> None:
        screen = self.screen() or self.windowHandle().screen()
        if not screen:
            scr = QApplication.desktop().availableGeometry(self)
            x = int((scr.width() - self.width()) / 2)
            y = int((scr.height() - self.height()) / 2)
            self.move(x, y)
            return
        geo = screen.availableGeometry()
        x = int(geo.center().x() - self.width() / 2)
        y = int(geo.center().y() - self.height() / 2)
        self.move(x, y)

    def showEvent(self, event):  # noqa: N802 (Qt signature)
        super().showEvent(event)
        self._apply_theme_once()
        self.center_on_screen()

    # Авторизация ------------------------------------------------------------
    @pyqtSlot()
    def attempt_login(self) -> None:
        user = self.edit_user.text().strip()
        pwd = self.edit_pass.text()
        if not user or not pwd:
            return self._fail("Введите USER ID и ACCESS KEY")
        if not self.auth.verify(user, pwd):
            return self._fail("Неверный логин или ключ")
        self.accept()

    def _fail(self, msg: str) -> None:
        self.error.setText(msg)
        for w in (self.edit_user, self.edit_pass):
            w.setProperty("error", True)
            w.style().unpolish(w)
            w.style().polish(w)
        card = self.findChild(QFrame, "AxiomCard")
        if not card:
            return
        anim = QPropertyAnimation(card, b"pos", self)
        start = card.pos()
        dx = 6
        anim.setDuration(220)
        anim.setKeyValueAt(0.0, start)
        anim.setKeyValueAt(0.25, start + QPoint(+dx, 0))
        anim.setKeyValueAt(0.50, start + QPoint(-dx, 0))
        anim.setKeyValueAt(0.75, start + QPoint(+dx, 0))
        anim.setKeyValueAt(1.00, start)
        anim.start(QPropertyAnimation.DeleteWhenStopped)

    def _clear_error_state(self) -> None:
        self.error.clear()
        for w in (self.edit_user, self.edit_pass):
            if w.property("error"):
                w.setProperty("error", False)
                w.style().unpolish(w)
                w.style().polish(w)

    # Стили ------------------------------------------------------------------
    def _apply_theme_once(self) -> None:
        if getattr(self, "_theme_applied", False):
            return
        qss = self._qss_path or "axiom_red.qss"
        try:
            apply_style_to_widget(self, qss)
        except Exception:
            pass
        self._theme_applied = True


# ─────────────────────────────────────────────────────────────────────────────
# Dev run (локальный тест этого файла)
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    import os
    os.environ.setdefault("QT_FONT_DPI", "96")
    os.environ.setdefault("QT_SCALE_FACTOR", "1")

    app = QApplication(sys.argv)
    try:
        app.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    except Exception:
        pass

    dlg = LoginWindow(qss_path=None)
    if dlg.width() != LoginWindow.DEF_WIDTH or dlg.height() != LoginWindow.DEF_HEIGHT:
        dlg.setFixedSize(LoginWindow.DEF_WIDTH, LoginWindow.DEF_HEIGHT)
    dlg.center_on_screen()

    if dlg.exec_() == dlg.Accepted:
        print("LOGIN: Accepted")
    else:
        print("LOGIN: Rejected")
    sys.exit(0)
