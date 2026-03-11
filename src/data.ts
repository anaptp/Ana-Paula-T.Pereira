export const B = {
  green: "#0a8f44", // Verde vibrante das folhas
  greenMid: "#12a353",
  greenLight: "#e6f5ec",
  navy: "#022b5e", // Azul escuro profundo (da folha escura e das ondas)
  navyLight: "#e6ecf2",
  yellow: "#ffb703", // Amarelo do sol
  blue: "#005bb5", // Azul das ondas
  white: "#ffffff",
  gray: "#f8f9fa",
 get logoUrl() {
  return "/logo.png";
}
};

export const T: Record<string, any> = {
  pt: {
    login: "Entrar", logout: "Sair", email: "E-mail", password: "Senha",
    dashboard: "Início", montagem: "Montagem", locacoes: "Locações", documentos: "Docs Extras", profile: "Perfil",
    hi: "Olá",
    totalMontagem: "Total Montagem", totalPago: "Total Pago", faltaPagar: "Falta Pagar",
    lucroTotal: "Lucro Total", totalDespesas: "Total Despesas",
    retornoInvestimento: "Retorno do Investimento",
    evolucaoLucro: "Evolução do Lucro Mensal",
    hospede: "Hóspede", nHospedes: "Hóspedes", data: "Data",
    diarias: "Diárias", quarto: "Quarto", valorLiquido: "Valor Líquido",
    taxaLimpeza: "Taxa Limpeza", comissao: "Comissão (20%)", extra: "Valor Extra",
    plataforma: "Plataforma", despesas: "Despesas", lucro: "Lucro",
    totalNoites: "Total de Noites", totalHospedes: "Total Hóspedes",
    print: "Imprimir", download: "Baixar",
    item: "Item", datCompra: "Data Compra", preco: "Preço", qtd: "Qtd",
    loja: "Loja", total: "Total",
    problemasInesperados: "Problemas inesperados ocorridos",
    servicosMontagem: "Serviços de Montagem",
    subtotalItens: "Subtotal Itens",
    emprestado: "Emprestado",
    mesAtual: "Mês atual",
    verDetalhes: "Ver detalhes",
    fechar: "Fechar",
    proprietario: "Proprietário",
    administrador: "Administrador",
    portalAdmin: "Portal do Administrador",
    portalProp: "Portal do Proprietário",
    seuNome: "Seu Nome",
    cadastrar: "Cadastrar",
    jaTenhoConta: "Já tenho uma conta",
    criarConta: "Criar nova conta",
    dadosPessoais: "Dados Pessoais",
    nomeCompleto: "Nome Completo",
    telefone: "Telefone",
    endereco: "Endereço",
    dataNascimento: "Data de Nascimento",
    salvar: "Salvar",
    dadosSalvos: "Dados salvos com sucesso!",
    editar: "Editar",
    alterarFoto: "Alterar foto",
    imprimirNfs: "Imprimir NFs",
    baixarNfs: "Baixar NFs",
    imprimirRelatorios: "Imprimir Relatórios",
    baixarRelatorios: "Baixar Relatórios",
    anexarRelatoriosAdmin: "Anexar Relatórios (Admin)",
    nenhumaLocacao: "Nenhuma locação registrada neste mês",
    lucroAcumulado: "Lucro Total Acumulado",
    avisoImportante: "Aviso Importante",
    confirmarLeitura: "Confirmar Leitura",
    meses: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    montagemPaga: "Montagem paga",
    recuperadoLocacoes: "Recuperado via locações",
    falta: "Falta",
    de: "de",
    lucroMensal: "Lucro mensal",
    acumulado: "Acumulado",
    rooms: {
      "Entrada": "Entrada",
      "Sala de Jantar": "Sala de Jantar",
      "Sala": "Sala",
      "Cozinha": "Cozinha",
      "Banheiro": "Banheiro",
      "Quarto": "Quarto",
      "Extras / Manutenção": "Extras / Manutenção"
    },
    issues: {
      "Chaminé do gás — tamanho não liberado pela Naturgy": "Chaminé do gás — tamanho não liberado pela Naturgy",
      "Bocal pia cozinha quebrado": "Bocal pia cozinha quebrado",
      "Cifão": "Cifão",
      "Instalação elétrica para ar condicionado": "Instalação elétrica para ar condicionado",
      "Instalação elétrica chuveiro": "Instalação elétrica chuveiro",
      "Retirada de câmeras": "Retirada de câmeras",
      "Roda pé com cupim": "Roda pé com cupim",
      "Colchão": "Colchão",
      "Tela mosqueteiro": "Tela mosqueteiro",
      "Buracos no rebaixamento de gesso": "Buracos no rebaixamento de gesso",
      "Paredes com pintura toda manchada": "Paredes com pintura toda manchada",
      "Cupim comeu o fundo do primeiro armário — comprou outro sem cobrar": "Cupim comeu o fundo do primeiro armário — comprou outro sem cobrar",
      "Muitas Baratas": "Muitas Baratas"
    }
  },
  en: {
    login: "Sign In", logout: "Sign Out", email: "Email", password: "Password",
    dashboard: "Home", montagem: "Setup", locacoes: "Bookings", documentos: "Extra Docs", profile: "Profile",
    hi: "Hello",
    totalMontagem: "Total Setup", totalPago: "Total Paid", faltaPagar: "Remaining",
    lucroTotal: "Total Profit", totalDespesas: "Total Expenses",
    retornoInvestimento: "Investment Return",
    evolucaoLucro: "Monthly Profit Evolution",
    hospede: "Guest", nHospedes: "Guests", data: "Date",
    diarias: "Nights", quarto: "Unit", valorLiquido: "Net Value",
    taxaLimpeza: "Cleaning Fee", comissao: "Commission (20%)", extra: "Extra",
    plataforma: "Platform", despesas: "Expenses", lucro: "Profit",
    totalNoites: "Total Nights", totalHospedes: "Total Guests",
    print: "Print", download: "Download",
    item: "Item", datCompra: "Purchase Date", preco: "Price", qtd: "Qty",
    loja: "Store", total: "Total",
    problemasInesperados: "Unexpected Issues",
    servicosMontagem: "Setup Services",
    subtotalItens: "Items Subtotal",
    emprestado: "Borrowed",
    mesAtual: "Current month",
    verDetalhes: "View details",
    fechar: "Close",
    proprietario: "Owner",
    administrador: "Administrator",
    portalAdmin: "Administrator Portal",
    portalProp: "Owner Portal",
    seuNome: "Your Name",
    cadastrar: "Sign Up",
    jaTenhoConta: "I already have an account",
    criarConta: "Create new account",
    dadosPessoais: "Personal Data",
    nomeCompleto: "Full Name",
    telefone: "Phone",
    endereco: "Address",
    dataNascimento: "Date of Birth",
    salvar: "Save",
    dadosSalvos: "Data saved successfully!",
    editar: "Edit",
    alterarFoto: "Change photo",
    imprimirNfs: "Print NFs",
    baixarNfs: "Download NFs",
    imprimirRelatorios: "Print Reports",
    baixarRelatorios: "Download Reports",
    anexarRelatoriosAdmin: "Attach Reports (Admin)",
    nenhumaLocacao: "No bookings registered this month",
    lucroAcumulado: "Total Accumulated Profit",
    avisoImportante: "Important Notice",
    confirmarLeitura: "Confirm Reading",
    meses: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    montagemPaga: "Setup paid",
    recuperadoLocacoes: "Recovered via bookings",
    falta: "Remaining",
    de: "of",
    lucroMensal: "Monthly profit",
    acumulado: "Accumulated",
    rooms: {
      "Entrada": "Entryway",
      "Sala de Jantar": "Dining Room",
      "Sala": "Living Room",
      "Cozinha": "Kitchen",
      "Banheiro": "Bathroom",
      "Quarto": "Bedroom",
      "Extras / Manutenção": "Extras / Maintenance"
    },
    issues: {
      "Chaminé do gás — tamanho não liberado pela Naturgy": "Gas chimney — size not approved by Naturgy",
      "Bocal pia cozinha quebrado": "Broken kitchen sink nozzle",
      "Cifão": "Siphon",
      "Instalação elétrica para ar condicionado": "Electrical installation for air conditioning",
      "Instalação elétrica chuveiro": "Electrical installation for shower",
      "Retirada de câmeras": "Camera removal",
      "Roda pé com cupim": "Baseboard with termites",
      "Colchão": "Mattress",
      "Tela mosqueteiro": "Mosquito net",
      "Buracos no rebaixamento de gesso": "Holes in the plaster ceiling",
      "Paredes com pintura toda manchada": "Walls with stained paint",
      "Cupim comeu o fundo do primeiro armário — comprou outro sem cobrar": "Termites ate the bottom of the first cabinet — bought another without charging",
      "Muitas Baratas": "Many cockroaches"
    }
  }
};

export const IMOVEL = {
  id: 1,
  nome: "Apartamento Zelador",
  apelido: "Bells Beach",
  proprietario: "Proprietário",
  comissaoPerc: 20,
  alerta: "Atenção: Este imóvel está encerrando as operações conosco no final deste mês. Por favor, verifique todas as faturas pendentes e faça o download dos seus relatórios.",
  montagem: {
    fatura: "056",
    data: "10/01/2026",
    totalMontagem: 23290.66,
    totalPago: 21046.10,
    comodos: [
      {
        nome: "Entrada",
        itens: [
          { item: "Protetor Veda porta (verde)", datCompra: "30/12/2024", preco: 9.99, qtd: 1, loja: "Vem K V", total: 9.99 },
          { item: "Cabide de Parede sanfonado", datCompra: "28/03/2023", preco: 9.95, qtd: 1, loja: "Atacadão Caxias", total: 9.95 },
          { item: "Banco Sapateira", datCompra: "27/12/2024", preco: 280.00, qtd: 1, loja: "Garimpo/confec.", total: 280.00 },
          { item: "Placa welcome", datCompra: "22/03/2025", preco: 75.00, qtd: 1, loja: "Garimpo", total: 75.00 },
          { item: "Placa Chaveiro Pontal", datCompra: "12/04/2025", preco: 40.00, qtd: 1, loja: "Pontal Artes", total: 40.00 },
          { item: "Tapete Capacho Entrada", datCompra: "15/01/2025", preco: 64.99, qtd: 1, loja: "Casa cortinas artigos ltda", total: 64.99 },
        ]
      },
      {
        nome: "Sala de Jantar",
        itens: [
          { item: "Tinta Bege (Leite e mel 800ml)", datCompra: "14/03/2023", preco: 71.59, qtd: 1, loja: "Loja Fluzão", total: 71.59 },
          { item: "Bancos Plásticos", datCompra: "30/12/2024", preco: 16.99, qtd: 4, loja: "Vem K V", total: 67.96 },
          { item: "Estofado do Baú", datCompra: "17/01/2025", preco: 300.00, qtd: 1, loja: "Com Estofados Ltda", total: 300.00 },
          { item: "Banco Baú + tampo da mesa Jant.", datCompra: "15/04/2025", preco: 385.00, qtd: 1, loja: "Garimpo/conf.", total: 385.00 },
          { item: "Tubo pvc Base Mesa fixa 3m", datCompra: "12/02/2025", preco: 80.00, qtd: 1, loja: "Garimpo", total: 80.00 },
          { item: "Trava de segurança magnética", datCompra: "11/01/2025", preco: 36.70, qtd: 1, loja: "Mercado livre", total: 36.70 },
          { item: "Jogo Americano", datCompra: "30/12/2025", preco: 7.99, qtd: 4, loja: "Vem K V", total: 31.96 },
          { item: "Refil Almofadas", datCompra: "01/04/2023", preco: 7.99, qtd: 2, loja: "Requinte Magazine", total: 15.98 },
          { item: "Capa de almofada", datCompra: "01/04/2023", preco: 12.99, qtd: 2, loja: "Requinte Magazine", total: 25.98 },
        ]
      },
      {
        nome: "Sala",
        itens: [
          { item: "TV 40\" Philco", datCompra: "31/03/2023", preco: 1303.90, qtd: 1, loja: "Carrefour Online", total: 1303.90 },
          { item: "Suporte fixo p/Tv 25 kg", datCompra: "30/12/2024", preco: 24.99, qtd: 1, loja: "Vem K V", total: 24.99 },
          { item: "Prateleira de madeira", datCompra: "04/12/2023", preco: 37.90, qtd: 2, loja: "Leroy Merlin", total: 75.80 },
          { item: "Mão francesa", datCompra: "04/12/2023", preco: 8.99, qtd: 4, loja: "Leroy Merlin", total: 35.96 },
          { item: "Cortina 260x170 cm", datCompra: "01/04/2023", preco: 99.99, qtd: 1, loja: "Requinte Magazine", total: 99.99 },
          { item: "Varão Cortina", datCompra: "28/03/2023", preco: 27.99, qtd: 1, loja: "Atacadão Caxias", total: 27.99 },
          { item: "Manta de sofá", datCompra: "—", preco: 0, qtd: 1, loja: "Emprestado", total: 0, emprestado: true },
          { item: "Lavagem sofá + Hipermeabilização", datCompra: "05/11/2025", preco: 359.00, qtd: 1, loja: "Wave Clean", total: 359.00 },
        ]
      },
      {
        nome: "Cozinha",
        itens: [
          { item: "Concerto Geladeira", datCompra: "08/01/2024", preco: 150.00, qtd: 1, loja: "Gelson Eletricista", total: 150.00 },
          { item: "Peça concerto Geladeria", datCompra: "08/01/2024", preco: 241.91, qtd: 1, loja: "Deluc Bazar", total: 241.91 },
          { item: "Geladeira (usada)", datCompra: "26/02/2026", preco: 800.00, qtd: 1, loja: "Usada", total: 800.00 },
          { item: "Fogão", datCompra: "23/12/2024", preco: 922.01, qtd: 1, loja: "Americanas online", total: 922.01 },
          { item: "Escorredor de pratos", datCompra: "28/03/2023", preco: 44.95, qtd: 1, loja: "Atacadão Caxias", total: 44.95 },
          { item: "Conjunto Aparelho de Jantar", datCompra: "30/03/2023", preco: 169.98, qtd: 1, loja: "Carrefour Mercado", total: 169.98 },
          { item: "Cafeteira Philco", datCompra: "30/03/2023", preco: 123.81, qtd: 1, loja: "Mercado Livre", total: 123.81 },
          { item: "Microondas", datCompra: "24/03/2023", preco: 400.00, qtd: 1, loja: "FC Refrigeração", total: 400.00 },
          { item: "Liquidificador", datCompra: "13/05/2022", preco: 169.00, qtd: 1, loja: "Ponto Frio", total: 169.00 },
          { item: "Kit de panelas", datCompra: "28/03/2023", preco: 119.99, qtd: 1, loja: "Atacadão Caxias", total: 119.99 },
          { item: "Aquecedor de água a gás", datCompra: "30/03/2023", preco: 799.90, qtd: 1, loja: "Amoedo", total: 799.90 },
          { item: "Vassoura", datCompra: "—", preco: 0, qtd: 1, loja: "Emprestado", total: 0, emprestado: true },
        ]
      },
      {
        nome: "Banheiro",
        itens: [
          { item: "Blindex e instalação", datCompra: "22/12/2023", preco: 900.00, qtd: 1, loja: "Silmar Vidros", total: 900.00 },
          { item: "Toalheiro Bamboo", datCompra: "10/03/2025", preco: 140.00, qtd: 1, loja: "Garimpo/confec.", total: 140.00 },
          { item: "Chuveiro", datCompra: "10/12/2024", preco: 80.00, qtd: 1, loja: "Os Carvalhos Recreio", total: 80.00 },
          { item: "Instalação elétrica", datCompra: "29/12/2024", preco: 200.00, qtd: 1, loja: "Gelson Eletricista", total: 200.00 },
          { item: "Toalhas de rosto", datCompra: "01/04/2023", preco: 12.99, qtd: 4, loja: "Oliveira com Roupas", total: 51.96 },
          { item: "Toalhas de banho", datCompra: "01/04/2023", preco: 29.99, qtd: 4, loja: "Oliveira com Roupas", total: 119.96 },
          { item: "Toalha de banho ravena", datCompra: "12/01/2025", preco: 29.99, qtd: 1, loja: "Vem K V", total: 29.99 },
          { item: "Toalhas pretas", datCompra: "—", preco: 0, qtd: 2, loja: "Emprestado", total: 0, emprestado: true },
        ]
      },
      {
        nome: "Quarto",
        itens: [
          { item: "Guarda Roupa Estante de pinus", datCompra: "22/03/2025", preco: 130.00, qtd: 1, loja: "Garimpo", total: 130.00 },
          { item: "Base Cama Box casal", datCompra: "14/09/2024", preco: 300.00, qtd: 1, loja: "Soares Móveis", total: 300.00 },
          { item: "Kit roupas de cama", datCompra: "17/07/2023", preco: 262.80, qtd: 3, loja: "Costco Wholesale", total: 788.40 },
          { item: "Ar condicionado Agratto", datCompra: "31/10/2023", preco: 3449.90, qtd: 1, loja: "Leroy Merlin", total: 3449.90 },
          { item: "Instalação ar cond. + Elétrica", datCompra: "27/12/2023", preco: 1063.00, qtd: 1, loja: "Rj Climatiza - Gomez", total: 1063.00 },
          { item: "Espelho Corpo inteiro", datCompra: "16/01/2026", preco: 1300.00, qtd: 1, loja: "Pontal Artes", total: 1300.00 },
          { item: "Cortina 260x170 cm", datCompra: "09/01/2025", preco: 129.90, qtd: 1, loja: "Vem K V", total: 129.90 },
          { item: "Colchão", datCompra: "—", preco: 0, qtd: 1, loja: "Emprestado", total: 0, emprestado: true },
          { item: "Ferro de passar roupa", datCompra: "—", preco: 0, qtd: 1, loja: "Emprestado", total: 0, emprestado: true },
          { item: "Cobertor", datCompra: "—", preco: 0, qtd: 1, loja: "Emprestado", total: 0, emprestado: true },
        ]
      },
      {
        nome: "Extras / Manutenção",
        itens: [
          { item: "Mão de obra montagem", datCompra: "10/01/2026", preco: 3800.00, qtd: 1, loja: "Apt Stays", total: 3800.00 },
          { item: "Tela Mosqueteiro (perfis + instalação)", datCompra: "03/11/2025", preco: 572.87, qtd: 1, loja: "Ilha Vidro e Aluminio", total: 572.87 },
          { item: "Cantoneira tela mosqueteiro", datCompra: "05/11/2025", preco: 85.00, qtd: 1, loja: "Canaan Serralheria", total: 85.00 },
          { item: "Verniz sparlack extra Mar", datCompra: "13/09/2025", preco: 43.90, qtd: 1, loja: "Os Carvalhos Recreio", total: 43.90 },
          { item: "Insulfilme espelhado", datCompra: "30/12/2024", preco: 54.31, qtd: 1, loja: "Mercado livre", total: 54.31 },
          { item: "Fio cabinho 6.0 MM (24m)", datCompra: "03/01/2025", preco: 7.21, qtd: 24, loja: "Pardal Mat. Const.", total: 173.04 },
        ]
      },
    ],
    problemasInesperados: [
      "Chaminé do gás — tamanho não liberado pela Naturgy",
      "Bocal pia cozinha quebrado",
      "Cifão",
      "Instalação elétrica para ar condicionado",
      "Instalação elétrica chuveiro",
      "Retirada de câmeras",
      "Roda pé com cupim",
      "Colchão",
      "Tela mosqueteiro",
      "Buracos no rebaixamento de gesso",
      "Paredes com pintura toda manchada",
      "Cupim comeu o fundo do primeiro armário — comprou outro sem cobrar",
      "Muitas Baratas",
    ]
  },
  locacoesPorMes: [
    {
      mes: "Jan 25", hospedes: 6, noites: 13, lucro: 2060.59,
      registros: [
        { hospede: "Morgane Yvart", nHospedes: 2, data: "01/01/2025", diarias: 1, quarto: "TUDO", valorLiquido: 105.24, taxaLimpeza: 0, comissao: 21.05, extra: 0, plataforma: "Booking", despesas: 0, lucro: 84.19 },
        { hospede: "Paula Orofino", nHospedes: 2, data: "03/01/2025", diarias: 3, quarto: "TUDO", valorLiquido: 315.71, taxaLimpeza: 0, comissao: 63.14, extra: 0, plataforma: "Booking", despesas: 0, lucro: 252.57 },
        { hospede: "Aziza Eduarda", nHospedes: 2, data: "07/01/2025", diarias: 4, quarto: "TUDO", valorLiquido: 625.46, taxaLimpeza: 55.00, comissao: 125.09, extra: 0, plataforma: "Airbnb", despesas: 0, lucro: 445.37 },
        { hospede: "Liliane Lida", nHospedes: 2, data: "11/01/2025", diarias: 5, quarto: "TUDO", valorLiquido: 586.31, taxaLimpeza: 0, comissao: 117.26, extra: 0, plataforma: "Booking", despesas: 0, lucro: 469.05 },
        { hospede: "Tatiane Cavalcanti", nHospedes: 2, data: "18/01/2025", diarias: 7, quarto: "TUDO", valorLiquido: 971.70, taxaLimpeza: 108.00, comissao: 194.34, extra: 0, plataforma: "Booking", despesas: 0, lucro: 669.36 },
        { hospede: "Lucas Alves", nHospedes: 2, data: "25/01/2025", diarias: 2, quarto: "TUDO", valorLiquido: 310.07, taxaLimpeza: 108.00, comissao: 62.01, extra: 0, plataforma: "Booking", despesas: 0, lucro: 140.06 },
      ]
    },
    { mes: "Fev 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Mar 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Abr 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Mai 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Jun 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Jul 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Ago 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Set 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Out 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Nov 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Dez 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Jan 26", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    { mes: "Fev 26", hospedes: 0, noites: 0, lucro: 0, registros: [] },
  ]
};

export const IMOVEIS_MOCK = [
  IMOVEL,
  {
    ...IMOVEL,
    id: 2,
    nome: "Cobertura Copacabana",
    apelido: "Copa Penthouse",
    alerta: "Lembrete: A vistoria anual do gás está agendada para a próxima semana.",
    montagem: {
      ...IMOVEL.montagem,
      totalMontagem: 45000.00,
      totalPago: 30000.00,
      comodos: [
        {
          nome: "Sala",
          itens: [
            { item: "Sofá Retrátil", datCompra: "10/05/2024", preco: 3500.00, qtd: 1, loja: "Tok&Stok", total: 3500.00 },
            { item: "TV 65 polegadas", datCompra: "12/05/2024", preco: 4200.00, qtd: 1, loja: "Fast Shop", total: 4200.00 },
          ]
        }
      ],
      problemasInesperados: ["Infiltração no teto da sala"]
    },
    locacoesPorMes: [
      {
        mes: "Jan 25", hospedes: 4, noites: 10, lucro: 4500.00,
        registros: [
          { hospede: "João Silva", nHospedes: 4, data: "05/01/2025", diarias: 10, quarto: "TUDO", valorLiquido: 5000.00, taxaLimpeza: 200.00, comissao: 500.00, extra: 0, plataforma: "Airbnb", despesas: 0, lucro: 4500.00 },
        ]
      },
      { mes: "Fev 25", hospedes: 0, noites: 0, lucro: 0, registros: [] },
    ]
  }
];
