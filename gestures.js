// gestures.js — LGP (Língua Gestual Portuguesa)
// MediaPipe 21 landmarks:
//  0=pulso, 1-4=polegar, 5-8=indicador,
//  9-12=médio, 13-16=anelar, 17-20=mindinho
// y cresce para BAIXO; x cresce para a direita (imagem espelhada)

function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

// Dedo levantado = ponta acima da articulação intermédia
function up(lm, tip, mid) { return lm[tip].y < lm[mid].y; }

// Dedo dobrado = ponta abaixo da base
function down(lm, tip, base) { return lm[tip].y > lm[base].y; }

// Dois pontos próximos
function near(a, b, t = 0.07) { return dist(a, b) < t; }

function classificarGesto(lm) {
    const iUp = up(lm, 8, 6);   // indicador levantado
    const mUp = up(lm, 12, 10);  // médio levantado
    const aUp = up(lm, 16, 14);  // anelar levantado
    const pUp = up(lm, 20, 18);  // mindinho levantado

    // Polegar: estendido para o lado exterior (imagem espelhada)
    const tUp = lm[4].x < lm[3].x;

    // Polegar apontado para cima (verticalidade)
    const tVertUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y;

    const nenhumUp = !iUp && !mUp && !aUp && !pUp;
    const todosUp = iUp && mUp && aUp && pUp;
    const apenasI = iUp && !mUp && !aUp && !pUp;
    const apenasP = !iUp && !mUp && !aUp && pUp;
    const IM = iUp && mUp && !aUp && !pUp;
    const IMA = iUp && mUp && aUp && !pUp;

    // ── A ── Punho fechado, polegar encostado na lateral do indicador
    if (nenhumUp && !tUp && !tVertUp) return 'A';

    // ── B ── 4 dedos esticados e juntos, polegar recolhido na palma
    if (todosUp && !tUp && Math.abs(lm[8].x - lm[20].x) < 0.12) return 'B';

    // ── C ── Formato de garra/arco aberto (polegar afastado do indicador)
    if (!iUp && !mUp && !aUp && !pUp && near(lm[8], lm[4], 0.15) && !near(lm[8], lm[4], 0.06)) return 'C';

    // ── D ── Indicador vertical, polegar toca no médio dobrado formando o anel
    if (apenasI && near(lm[4], lm[12], 0.09)) return 'D';

    // ── E ── Dedos recolhidos com as falanges flectidas (pontas tocam perto das bases)
    if (nenhumUp && lm[8].y > lm[5].y && lm[12].y > lm[9].y && lm[16].y > lm[13].y && lm[20].y > lm[17].y) return 'E';

    // ── F ── Indicador dobra para baixo e toca na ponta do polegar, restantes 3 esticados
    if (!iUp && mUp && aUp && pUp && near(lm[8], lm[4], 0.08)) return 'F';

    // ── G ── Indicador esticado na horizontal (mão de lado), polegar paralelo recolhido
    if (apenasI && Math.abs(lm[8].y - lm[5].y) < 0.05 && !tUp) return 'G';

    // ── H ── Indicador e Médio esticados na horizontal e paralelos
    if (IM && Math.abs(lm[8].y - lm[12].y) < 0.06 && !tUp) return 'H';

    // ── I ── Apenas o dedo mindinho levantado na vertical, polegar fechado
    if (apenasP && !tUp) return 'I';

    // ── J ── Estático simplificado (Derivado do I, mindinho esticado + polegar estendido)
    if (apenasP && tUp) return 'J';

    // ── L ── Indicador na vertical e polegar totalmente estendido na horizontal (Forma "L")
    if (apenasI && tUp) return 'L';

    // ── K ── Indicador e Médio em V, polegar projeta-se para a frente tocando na base do médio
    if (IM && near(lm[4], lm[12], 0.09) && !tUp) return 'K';

    // ── M ── Dedos indicador, médio e anelar virados para baixo sobre o polegar escondido
    if (nenhumUp && lm[8].y > lm[4].y && lm[12].y > lm[4].y && lm[16].y > lm[4].y) return 'M';

    // ── N ── Dedos indicador e médio virados para baixo sobre o polegar, anelar recolhido atrás
    if (nenhumUp && lm[8].y > lm[4].y && lm[12].y > lm[4].y && lm[16].y < lm[4].y) return 'N';

    // ── O ── Pontas de todos os dedos curvadas tocando ou quase tocando no polegar (Círculo perfeito)
    if (nenhumUp && near(lm[4], lm[8], 0.06)) return 'O';

    // ── P ── Indicador e Médio estendidos a apontar ligeiramente para a frente/baixo, polegar estendido
    if (IM && lm[8].y > lm[6].y + 0.08 && !tUp) return 'P';

    // ── W ── Três dedos levantados (Indicador, Médio, Anelar) bem afastados
    if (IMA && !pUp) return 'W';

    // ── R ── Indicador e Médio totalmente esticados mas cruzados um sobre o outro
    if (IM && Math.abs(lm[8].x - lm[12].x) < 0.04 && !tUp) return 'R';

    // ── S ── Punho completamente fechado com o polegar recolhido à frente dos dedos
    if (nenhumUp && tUp && lm[4].y < lm[8].y) return 'S';

    // ── T ── Unhas dos dedos fechadas, com o polegar inserido e cruzado atrás do indicador
    if (nenhumUp && near(lm[4], lm[6], 0.07)) return 'T';

    // ── U ── Indicador e Médio totalmente esticados para cima e colados (Sem espaço entre eles)
    if (IM && Math.abs(lm[8].x - lm[12].x) < 0.07 && !tUp) return 'U';

    // ── V ── Indicador e Médio esticados para cima mas abertos em forma de "V"
    if (IM && Math.abs(lm[8].x - lm[12].x) >= 0.07 && !tUp) return 'V';

    // ── X ── Indicador recolhido e dobrado em forma de gancho, outros fechados
    if (!iUp && !mUp && !aUp && !pUp && lm[8].y > lm[7].y && lm[7].y < lm[6].y) return 'X';

    // ── Q ── Indicador e Polegar apontados para baixo (Gesto em pinça aberta vertical)
    if (apenasI && tUp && lm[8].y > lm[5].y + 0.05) return 'Q';

    // ── Y ── Polegar e Mindinho totalmente esticados para os lados opostos, intermédios fechados
    if (!iUp && !mUp && !aUp && pUp && tUp) return 'Y';

    // ── Z ── Apenas o dedo indicador apontado para cima (Configuração inicial do desenho do Z)
    if (apenasI && !tUp) return 'Z';

    return null;
}