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

    // Polegar: estendido para o lado (imagem espelhada)
    const tUp = lm[4].x < lm[3].x;

    // Polegar apontado para cima
    const tVertUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y;

    const nenhumUp = !iUp && !mUp && !aUp && !pUp;
    const todosUp = iUp && mUp && aUp && pUp;
    const apenasI = iUp && !mUp && !aUp && !pUp;
    const apenasP = !iUp && !mUp && !aUp && pUp;
    const IM = iUp && mUp && !aUp && !pUp;
    const IMA = iUp && mUp && aUp && !pUp;

    // ── A ── punho fechado, polegar ao lado (dobrado sobre indicador)
    if (nenhumUp && !tUp && !tVertUp) return 'A';

    // ── B ── 4 dedos levantados juntos, polegar dobrado para dentro
    if (todosUp && !tUp &&
        Math.abs(lm[8].x - lm[20].x) < 0.12) return 'B';

    // ── C ── forma de arco/garra — todos ligeiramente curvos
    if (!iUp && !mUp && !aUp && !pUp &&
        near(lm[8], lm[4], 0.15) &&
        !near(lm[8], lm[4], 0.06)) return 'C';

    // ── D ── indicador levantado, polegar toca ponta do médio, outros dobrados
    if (apenasI && near(lm[4], lm[12], 0.09)) return 'D';

    // ── E ── todos os dedos dobrados, pontas curvadas para baixo
    if (nenhumUp &&
        lm[8].y > lm[5].y &&
        lm[12].y > lm[9].y &&
        lm[16].y > lm[13].y &&
        lm[20].y > lm[17].y) return 'E';

    // ── F ── indicador dobrado toca polegar, outros 3 levantados
    if (!iUp && mUp && aUp && pUp &&
        near(lm[8], lm[4], 0.08)) return 'F';

    // ── G ── indicador aponta para o lado (horizontal), polegar paralelo
    if (apenasI && tUp &&
        Math.abs(lm[8].y - lm[5].y) < 0.06) return 'G';

    // ── H ── indicador + médio apontados para o lado (horizontais)
    if (IM && !tUp &&
        Math.abs(lm[8].y - lm[5].y) < 0.06 &&
        Math.abs(lm[12].y - lm[9].y) < 0.06) return 'H';

    // ── I ── só mindinho levantado, polegar dobrado
    if (apenasP && !tUp) return 'I';

    // ── J ── como I mas com movimento (simplificado: mindinho + polegar)
    if (apenasP && tUp) return 'J';

    // ── K ── indicador + médio levantados em V, polegar entre eles
    if (IM && near(lm[4], lm[12], 0.10) && tUp) return 'K';

    // ── L ── indicador levantado + polegar estendido formam L
    if (apenasI && tUp &&
        lm[8].y < lm[5].y) return 'L';

    // ── M ── 3 dedos (indicador, médio, anelar) dobrados sobre o polegar
    if (nenhumUp && tVertUp &&
        lm[8].y > lm[4].y &&
        lm[12].y > lm[4].y &&
        lm[16].y > lm[4].y) return 'M';

    // ── N ── 2 dedos (indicador, médio) dobrados sobre o polegar
    if (nenhumUp && tVertUp &&
        lm[8].y > lm[4].y &&
        lm[12].y > lm[4].y &&
        lm[16].y < lm[4].y) return 'N';

    // ── O ── círculo fechado: todos os dedos formam O com polegar
    if (nenhumUp && near(lm[4], lm[8], 0.06)) return 'O';

    // ── P ── indicador + médio apontados para baixo, polegar estendido
    if (IM && tUp &&
        lm[8].y > lm[5].y + 0.05 &&
        lm[12].y > lm[9].y + 0.05) return 'P';

    // ── Q ── como G mas indicador aponta para baixo
    if (apenasI && tUp &&
        lm[8].y > lm[5].y + 0.05) return 'Q';

    // ── R ── indicador + médio cruzados (muito juntos)
    if (IM && !tUp &&
        Math.abs(lm[8].x - lm[12].x) < 0.03) return 'R';

    // ── S ── punho fechado, polegar por cima dos dedos
    if (nenhumUp && tUp &&
        lm[4].y < lm[8].y &&
        lm[4].x > lm[8].x) return 'S';

    // ── T ── polegar entre indicador e médio
    if (nenhumUp && near(lm[4], lm[6], 0.07)) return 'T';

    // ── U ── indicador + médio juntos e paralelos (para cima)
    if (IM && !tUp &&
        Math.abs(lm[8].x - lm[12].x) < 0.05 &&
        lm[8].y < lm[5].y) return 'U';

    // ── V ── indicador + médio em V (afastados)
    if (IM && !tUp &&
        Math.abs(lm[8].x - lm[12].x) >= 0.05) return 'V';

    // ── W ── indicador + médio + anelar levantados em leque
    if (IMA && !pUp && !tUp) return 'W';

    // ── X ── indicador dobrado em gancho
    if (!iUp && !mUp && !aUp && !pUp &&
        lm[8].y > lm[7].y &&
        lm[7].y < lm[6].y) return 'X';

    // ── Y ── polegar + mindinho estendidos (shaka 🤙)
    if (!iUp && !mUp && !aUp && pUp && tUp) return 'Y';

    // ── Z ── só indicador levantado, sem polegar (simplificado)
    if (apenasI && !tUp) return 'Z';

    return null;
}