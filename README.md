# Prototipo de estrategia lateral

Base modular para un juego 2D side-scroller inspirado en Stick War, construido con HTML5, JavaScript modules y Canvas.

## Estructura recomendada

```text
.
├── index.html              # Entrada HTML, HUD y controles
├── styles/
│   └── main.css            # Estilos de pantalla completa y UI
└── src/
    ├── main.js             # Inicializa el juego
    ├── config.js           # Constantes globales
    ├── core/
    │   ├── Camera.js       # Camara horizontal con bordes/flechas
    │   ├── Game.js         # Game loop, economia, IA y render base
    │   └── InputController.js
    ├── world/
    │   └── mapConfig.js    # Dimensiones del campo y posiciones clave
    ├── entities/
    │   ├── Projectile.js   # Flechas con arco simple
    │   ├── Statue.js       # Bases con HP
    │   └── Unit.js         # Minero, Swordwrath y Archidon
    └── ui/                 # Reservado para extraer HUD en siguientes pasos
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
- Entrena mineros, Swordwrath y Archidon desde el HUD.
- Usa `Defender`, `Mantener` y `Atacar` para cambiar el comportamiento aliado global.
- Destruye la estatua enemiga antes de que la IA destruya la tuya.
