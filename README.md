# Prototipo de estrategia lateral

Base modular para un juego 2D side-scroller inspirado en Stick War, construido con HTML5, JavaScript modules y Canvas.

## Estructura recomendada

```text
.
├── index.html              # Entrada HTML y HUD basico
├── styles/
│   └── main.css            # Estilos de pantalla completa y UI
└── src/
    ├── main.js             # Inicializa el juego
    ├── config.js           # Constantes globales
    ├── core/
    │   ├── Camera.js       # Camara horizontal con bordes/flechas
    │   ├── Game.js         # Game loop, resize y render base
    │   └── InputController.js
    ├── world/
    │   └── mapConfig.js    # Dimensiones del campo y posiciones clave
    ├── entities/           # Futuras clases Unit, Miner, Archer, etc.
    └── ui/                 # Futuros modulos HUD y comandos
```

## Ejecutar localmente

Como se usan JavaScript modules, sirve el proyecto con un servidor estatico:

```bash
python3 -m http.server 8000
```

Luego abre `http://localhost:8000`.

## Controles actuales

- Mueve el mouse a los bordes izquierdo/derecho de la pantalla para desplazar la camara.
- Usa `Flecha izquierda`, `Flecha derecha`, `A` o `D` como alternativa.
- El mapa mide 3 veces el ancho visible de la pantalla.
