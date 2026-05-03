# 🎓 Semester-Blaster: The Academic Survival Shooter

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![Canvas](https://img.shields.io/badge/Canvas-API-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge)

**Semester-Blaster** é um jogo de tiro espacial 2D (Shoot 'em up) desenvolvido totalmente do zero, sem o uso de *engines* gráficas (como Unity ou Godot) ou bibliotecas de terceiros[cite: 2, 3]. Este projeto é uma entrega técnica e artística para a disciplina de **Computação Gráfica (CG)**, sob a tutela do Professor Matheus[cite: 2].

O jogo traz uma forte metáfora da jornada universitária: o jogador controla um estudante em sua nave, enfrentando hordas de disciplinas ("Física 1", "Cálculo 3", "Grafos", etc.) que caem implacavelmente pela tela[cite: 3]. A jornada culmina no confronto final contra a entidade mais temida da graduação: **O Chefão TCC (Thanos-TCC)**[cite: 2, 3].

---

## 👥 Equipe de Desenvolvimento

* **Hyan Victor** - *Engenharia de Software & Programação Gráfica* (Implementação de todos os algoritmos de rasterização, motor físico e game loop)[cite: 2].
* **Yasmin** - *Quality Assurance (QA) & Playtesting* (Responsável por balanceamento de dificuldade, testes de *edge-cases* na colisão e validação de usabilidade).

---

## ⚙️ Arquitetura e Motor Gráfico (Requisitos de CG)

O grande diferencial técnico deste projeto é a **abstenção do uso de funções prontas da API Canvas** (como `ctx.fillRect`, `ctx.arc` ou `ctx.lineTo`) para a renderização das entidades de jogo. Todo o motor de renderização foi escrito na mão, manipulando a memória de vídeo através de um *Buffer* de pixels (`ImageData`)[cite: 3].

Abaixo detalhamos como cada requisito da disciplina foi implementado na arquitetura do jogo:

### 1. Manipulação de Matriz de Pixels (Set Pixel)
* **Implementação:** Foi criada uma função core `setPixel(x, y, r, g, b, a)` que atua diretamente no array unidimensional do `ImageData`[cite: 3].
* **Performance:** Para evitar gargalos, o jogo utiliza *Double Buffering* com um `offscreenCanvas`, montando todo o frame em memória antes de enviá-lo para a tela em uma única operação (`putImageData` / `drawImage`)[cite: 3].

### 2. Algoritmos de Rasterização (Primitivas)
* **Retas (Bresenham):** A função `drawLine` traça pixels ideais minimizando o uso de ponto flutuante[cite: 3]. Usada extensivamente no **campo de estrelas 3D**, nos lasers dos tiros e nos módulos decorativos da tela inicial[cite: 3].
* **Círculos e Elipses (Ponto Médio):** As funções `drawCircleMidpoint` e `drawEllipseMidpoint` exploram a simetria de ordem 8 e 4. Foram aplicadas na construção das *Artes Retro-Wave* da tela de Menu (planetas e anéis orbitais)[cite: 3].

### 3. Algoritmos de Preenchimento de Regiões
* **Flood Fill (Pilha/Stack):** Implementado com uma abordagem interativa (não recursiva para evitar *Stack Overflow*) usando pilhas. Ele pinta as decorações do menu de abertura delimitadas pelas primitivas[cite: 3].
* **Scanline Sólido:** Pinta triângulos linha por linha interpolando os vértices em Y. Usado na construção dos cascos das naves inimigas[cite: 3].
* **✨ Scanline com Gradiente Dinâmico:** Uma evolução do Scanline base. Na nave do jogador, o algoritmo não apenas preenche o triângulo, mas **interpola as cores** (RGB) entre os vértices (variando de Ciano para Azul Escuro) criando um efeito visual moderno de degradê[cite: 3].

### 4. Transformações Geométricas 2D
* **Rotação e Escala:** Implementadas através de matrizes matemáticas (`rotatePoint` usando Seno/Cosseno). O maior exemplo é o efeito de **Death Spin**[cite: 3]. Quando inimigos morrem, eles se dividem em fragmentos triangulares que rotacionam no próprio eixo enquanto sua escala diminui gradativamente até desaparecer[cite: 3].

### 5. Recorte Analítico (Clipping)
* **Cohen-Sutherland:** Aplicado de forma nativa dentro da função `drawLine`. Antes de um pixel da reta ser desenhado, seus vértices passam pelos "OutCodes" (Top, Bottom, Left, Right) da Viewport[cite: 3]. Isso otimiza o Starfield 3D e evita estouro de memória quando retas tentam ser traçadas fora dos limites de recorte da janela atual[cite: 3].

### 6. Sistema de Janela e Viewport Dinâmica
* **Transformação World-to-Viewport:** O universo de jogo ("World", onde os cálculos físicos e colisões ocorrem) é separado matematicamente da "Viewport" (os pixels reais na tela)[cite: 3].
* **Câmera/Zoom Interativo:** Graças a essa separação, o jogador pode usar as teclas `Z` (Zoom In) e `X` (Zoom Out) em tempo real, e a matriz de projeção ajusta dinamicamente a área visível do World esticando ou encolhendo os elementos na Viewport sem distorcer o *hitbox* do jogo[cite: 3].

### 7. Mapeamento de Textura Bidimensional
* **Coordenadas Baricêntricas (UV Mapping):** O grande confronto com o Boss (TCC) utiliza uma imagem em bitmap (`thanos2.png`) mapeada proceduralmente sobre geometria rasterizada em tempo de jogo[cite: 3]. A função `drawTexturedTriangle` pega as coordenadas U/V da textura e as interpola através do cálculo de área de triângulos para pintar o rosto do boss pixel a pixel, descartando o canal Alpha (transparência) quando necessário[cite: 3].

---

## 🕹️ Mecânicas, Gameplay e Sistemas

* **Naves e Upgrades (Loja):** Com as moedas dropadas por inimigos, o jogador pode comprar Upgrades que alteram completamente a lógica de `Cooldown` da nave. O jogo conta com Tiros Simples, Tiros Rápidos e uma Nave Automática Final de Tiro Duplo[cite: 3].
* **Sistema de Fases e Progressão:** A dificuldade escala logicamente (Semestre 1, Semestre 2, Chefão) aumentando as linhas de inimigos[cite: 3].
* **Menu Interativo & Passwords:** Sistema de salvamento via LocalStorage e senhas secretas predefinidas (ex: `"TCC00"`, `"SEM02"`) que manipulam a variável `startLevel`[cite: 3].
* **HUD e Radar Minimapa:** Desenvolvido no painel lateral, conta com dados em tempo real e um Radar construído em um Canvas secundário estático que mapeia as coordenadas (x,y) de todos os inimigos ativos na arena de combate para orientar o jogador[cite: 2, 3].
* **Modo "NOVO GAME +" (NG+):** Modo Hardcore liberado após derrotar o Boss. Naves inimigas têm o dobro de HP, movespeed mais alto e o jogador é forçado a usar suas habilidades evasivas ao máximo[cite: 3].
* **Efeitos Visuais:** Animações baseadas em frame/tempo que não dependem da taxa de atualização do monitor: Partículas de explosão (`createExplosion`), Starfield infinito via manipulação de Coordenadas Z simuladas em 2D, e tremores de tela (`screenShake`) ao levar dano[cite: 3].

---
---

## 🚀 Como Rodar o Projeto

Para que o motor gráfico funcione corretamente — especialmente a leitura em memória das texturas (como a imagem do Boss Final) —, o jogo **não pode** ser aberto simplesmente com um duplo-clique no arquivo `index.html` (protocolo `file:///`). É necessário rodar em um servidor local para evitar bloqueios de segurança (CORS) do navegador no uso do HTML5 Canvas.

**A forma mais fácil de testar é usando o Visual Studio Code (VS Code):**

1. **Abra o VS Code:** Abra a pasta raiz do projeto (`Semester-Blaster`) no seu Visual Studio Code.
2. **Instale a extensão Live Server:**
   - Vá até a aba de **Extensões** no menu lateral esquerdo (ou pressione `Ctrl+Shift+X`).
   - Pesquise por **"Live Server"** (criado por *Ritwick Dey*).
   - Clique em **Instalar**.
3. **Inicie o Jogo:**
   - No painel de arquivos do VS Code, clique com o botão direito em cima do arquivo `index.html`.
   - Selecione a opção **"Open with Live Server"** (ou clique no botão **"Go Live"** que vai aparecer na barra inferior do VS Code).
4. O seu navegador padrão vai abrir automaticamente no endereço `http://127.0.0.1:5500/index.html`. 
5. Agora é só jogar, sobreviver aos semestres e tentar não reprovar no TCC!
---

## ⌨️ Controles

| Ação | Tecla Principal | Tecla Alternativa |
| :--- | :---: | :---: |
| **Movimentação** | `Setas ← / →` | `A / D` |
| **Atirar (Fire)** | `Barra de Espaço` | - |
| **Zoom Dinâmico (Câmera)**| `Z` (In) / `X` (Out) | - |
| **Seleção de Upgrades**| `1`, `2`, `3`, `4` | - |
| **Restart (Game Over)**| `R` | - |
| **Menu (Pós-Zerar)**| `M` | - |

---

> *"Achou que ia escapar, moleque? Vai passar 10 anos na UECE!" - THANOS-TCC, O Chefão.*[cite: 3]