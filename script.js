document.addEventListener('DOMContentLoaded', () => {
    // Constantes
    const GRID_SIZE = 16;
    const PIXEL_GRID = document.getElementById('pixel-grid');
    
    // Estado da aplicação
    let currentColor = '#000000';
    let currentTool = 'pencil';
    let isDrawing = false;
    let pixelGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#FFFFFF'));
    let undoStack = [];
    let redoStack = [];
    
    // Inicialização
    initGrid();
    initTools();
    initColorPalette();
    initActions();
    initFooter();
    addKeyboardShortcuts();
    showWelcomeMessage();
    
    // Funções de inicialização
    function initGrid() {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const pixel = document.createElement('div');
                pixel.classList.add('pixel');
                pixel.dataset.x = x;
                pixel.dataset.y = y;
                
                // Eventos do mouse para desenhar
                pixel.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevenir seleção de texto
                    isDrawing = true;
                    saveState(); // Salvar estado antes de desenhar
                    applyTool(e.target);
                });
                
                pixel.addEventListener('mouseenter', (e) => {
                    if (isDrawing) {
                        applyTool(e.target);
                    }
                });
                
                // Evento de toque para dispositivos móveis
                pixel.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    isDrawing = true;
                    saveState();
                    applyTool(e.target);
                });
                
                pixel.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    if (isDrawing) {
                        // Obter o elemento sob o toque
                        const touch = e.touches[0];
                        const element = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (element && element.classList.contains('pixel')) {
                            applyTool(element);
                        }
                    }
                });
                
                PIXEL_GRID.appendChild(pixel);
            }
        }
        
        // Parar de desenhar quando o mouse é solto
        document.addEventListener('mouseup', () => {
            isDrawing = false;
        });
        
        // Parar de desenhar quando o toque termina
        document.addEventListener('touchend', () => {
            isDrawing = false;
        });
        
        // Evitar comportamento padrão de arrastar
        PIXEL_GRID.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
    
    function initTools() {
        const tools = document.querySelectorAll('.tool');
        
        tools.forEach(tool => {
            tool.addEventListener('click', () => {
                // Remover classe ativa de todas as ferramentas
                tools.forEach(t => t.classList.remove('active'));
                
                // Adicionar classe ativa à ferramenta selecionada
                tool.classList.add('active');
                
                // Atualizar ferramenta atual
                currentTool = tool.id;
                
                // Feedback visual
                showTooltip(`Ferramenta: ${getToolName(currentTool)}`);
            });
        });
    }
    
    function getToolName(toolId) {
        switch(toolId) {
            case 'pencil': return 'Pincel';
            case 'bucket': return 'Balde';
            case 'eraser': return 'Borracha';
            default: return toolId;
        }
    }
    
    function initColorPalette() {
        const colors = document.querySelectorAll('.color');
        
        colors.forEach(color => {
            color.addEventListener('click', () => {
                // Remover classe selecionada de todas as cores
                colors.forEach(c => c.classList.remove('selected'));
                
                // Adicionar classe selecionada à cor clicada
                color.classList.add('selected');
                
                // Atualizar cor atual
                currentColor = color.dataset.color;
                
                // Feedback visual
                showTooltip(`Cor selecionada: ${currentColor}`);
            });
        });
    }
    
    function initActions() {
        // Botão Limpar
        document.getElementById('clear').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar a grade? Esta ação não pode ser desfeita.')) {
                saveState();
                clearGrid();
                showTooltip('Grade limpa!');
            }
        });
        
        // Botão Exportar PNG
        document.getElementById('export-png').addEventListener('click', () => {
            exportAsPNG();
            showTooltip('PNG exportado com sucesso!');
        });
        
        // Botão Exportar JSON
        document.getElementById('export-json').addEventListener('click', () => {
            exportAsJSON();
            showTooltip('JSON exportado com sucesso!');
        });
    }
    
    function initFooter() {
        // Garantir que o link do footer seja clicável
        const footerLink = document.getElementById('github-link');
        if (footerLink) {
            footerLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.open(this.href, '_blank');
            });
        }
    }
    
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z para desfazer
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undo();
            }
            
            // Ctrl+Y para refazer
            if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                redo();
            }
            
            // Teclas de atalho para ferramentas
            switch (e.key) {
                case 'p': // Pincel
                    document.getElementById('pencil').click();
                    break;
                case 'b': // Balde
                    document.getElementById('bucket').click();
                    break;
                case 'e': // Borracha
                    document.getElementById('eraser').click();
                    break;
            }
        });
    }
    
    // Funções das ferramentas
    function applyTool(pixel) {
        const x = parseInt(pixel.dataset.x);
        const y = parseInt(pixel.dataset.y);
        
        switch (currentTool) {
            case 'pencil':
                setPixelColor(pixel, x, y, currentColor);
                break;
            case 'bucket':
                fillArea(x, y, pixelGrid[y][x], currentColor);
                updateGridDisplay();
                break;
            case 'eraser':
                setPixelColor(pixel, x, y, '#FFFFFF');
                break;
        }
    }
    
    function setPixelColor(pixel, x, y, color) {
        // Não fazer nada se a cor for a mesma
        if (pixelGrid[y][x] === color) return;
        
        pixel.style.backgroundColor = color;
        pixelGrid[y][x] = color;
    }
    
    function fillArea(x, y, targetColor, newColor) {
        // Não fazer nada se a cor alvo for igual à nova cor
        if (targetColor === newColor) return;
        
        // Algoritmo de preenchimento por inundação (flood fill) não recursivo
        // para evitar estouro de pilha em áreas grandes
        const stack = [{x, y}];
        
        while (stack.length > 0) {
            const {x: currentX, y: currentY} = stack.pop();
            
            if (
                currentX < 0 || currentX >= GRID_SIZE || 
                currentY < 0 || currentY >= GRID_SIZE || 
                pixelGrid[currentY][currentX] !== targetColor
            ) {
                continue;
            }
            
            pixelGrid[currentY][currentX] = newColor;
            
            // Adicionar pixels adjacentes à pilha
            stack.push({x: currentX + 1, y: currentY});
            stack.push({x: currentX - 1, y: currentY});
            stack.push({x: currentX, y: currentY + 1});
            stack.push({x: currentX, y: currentY - 1});
        }
    }
    
    function updateGridDisplay() {
        const pixels = document.querySelectorAll('.pixel');
        
        pixels.forEach(pixel => {
            const x = parseInt(pixel.dataset.x);
            const y = parseInt(pixel.dataset.y);
            pixel.style.backgroundColor = pixelGrid[y][x];
        });
    }
    
    function clearGrid() {
        // Redefinir todos os pixels para branco
        pixelGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill('#FFFFFF'));
        updateGridDisplay();
    }
    
    // Funções de histórico
    function saveState() {
        // Salvar estado atual no histórico de desfazer
        undoStack.push(JSON.parse(JSON.stringify(pixelGrid)));
        
        // Limpar histórico de refazer
        redoStack = [];
        
        // Limitar tamanho da pilha para evitar uso excessivo de memória
        if (undoStack.length > 30) {
            undoStack.shift();
        }
    }
    
    function undo() {
        if (undoStack.length === 0) {
            showTooltip('Não há ações para desfazer!');
            return;
        }
        
        // Salvar estado atual na pilha de refazer
        redoStack.push(JSON.parse(JSON.stringify(pixelGrid)));
        
        // Restaurar estado anterior
        pixelGrid = undoStack.pop();
        updateGridDisplay();
        
        showTooltip('Ação desfeita!');
    }
    
    function redo() {
        if (redoStack.length === 0) {
            showTooltip('Não há ações para refazer!');
            return;
        }
        
        // Salvar estado atual na pilha de desfazer
        undoStack.push(JSON.parse(JSON.stringify(pixelGrid)));
        
        // Restaurar próximo estado
        pixelGrid = redoStack.pop();
        updateGridDisplay();
        
        showTooltip('Ação refeita!');
    }
    
    // Funções de exportação
    function exportAsPNG() {
        // Criar um canvas temporário para gerar a imagem
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const pixelSize = 20; // Tamanho de cada pixel na imagem exportada
        
        canvas.width = GRID_SIZE * pixelSize;
        canvas.height = GRID_SIZE * pixelSize;
        
        // Preencher fundo branco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar cada pixel no canvas
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                ctx.fillStyle = pixelGrid[y][x];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
        
        // Converter canvas para URL de dados e iniciar download
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `pixel-art-${getFormattedDate()}.png`;
        link.href = dataURL;
        link.click();
    }
    
    function exportAsJSON() {
        // Converter a matriz de pixels para JSON
        const jsonData = JSON.stringify({
            width: GRID_SIZE,
            height: GRID_SIZE,
            pixels: pixelGrid,
            date: new Date().toISOString()
        }, null, 2);
        
        // Criar um blob e iniciar download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `pixel-art-${getFormattedDate()}.json`;
        link.href = url;
        link.click();
        
        // Limpar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    // Funções auxiliares
    function getFormattedDate() {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    }
    
    function showTooltip(message) {
        // Verificar se já existe um tooltip
        let tooltip = document.querySelector('.tooltip');
        
        if (!tooltip) {
            // Criar um novo tooltip
            tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            document.body.appendChild(tooltip);
        }
        
        // Atualizar mensagem e exibir
        tooltip.textContent = message;
        tooltip.style.opacity = '1';
        
        // Esconder após 2 segundos
        clearTimeout(tooltip.timeout);
        tooltip.timeout = setTimeout(() => {
            tooltip.style.opacity = '0';
        }, 2000);
    }
    
    function showWelcomeMessage() {
        showTooltip('Bem-vindo ao Editor de Pixel Art! Comece a desenhar!');
    }
}); 