/**
 * Dados e cálculos partilhados — Pátio Triagem (comparativo + proposta).
 */
(function (global) {
    var PLANS = {
        essencial: {
            id: 'essencial',
            name: 'Essencial',
            setup: 1900,
            monthly: 199,
            annual: 5499,
            users: 5,
            trainingHours: '4 horas',
            trainingLabel: '4 horas (operador + gerente)',
            support: '15 dias',
            sla: '72 h úteis',
            timeline: '5–10 dias úteis'
        },
        profissional: {
            id: 'profissional',
            name: 'Profissional',
            setup: 3800,
            monthly: 399,
            annual: 10499,
            users: 15,
            trainingHours: '8 horas',
            trainingLabel: '8 horas (inclui perfil financeiro)',
            support: '30 dias prioritário',
            sla: '48 h úteis',
            timeline: '15–20 dias úteis'
        },
        corporativo: {
            id: 'corporativo',
            name: 'Corporativo',
            setup: 5899,
            monthly: 599,
            annual: 13999,
            users: 999,
            usersLabel: 'Ilimitados',
            trainingHours: '12 horas + manual',
            trainingLabel: '12 horas + manual de operação',
            support: '45 dias + SLA 24 h',
            sla: '24 h úteis',
            timeline: '25–40 dias úteis'
        }
    };

    var ADDONS = [
        {
            id: 'cron_tbl',
            name: 'Sincronização TBL automática (cron)',
            setup: 3500,
            monthly: 0,
            annual: 0,
            label: 'R$ 3.500 (único)',
            excludePlans: ['corporativo'],
            note: 'Roadmap incluído no Corporativo (aditivo)'
        },
        {
            id: 'localidade',
            name: 'Segunda localidade TBL / pátio adicional',
            setup: 8500,
            monthly: 0,
            annual: 0,
            label: 'R$ 8.500 (único)'
        },
        {
            id: 'pix',
            name: 'Gateway PIX para cobrança de antecipação',
            setup: 4500,
            monthly: 89,
            annual: 0,
            label: 'R$ 4.500 + R$ 89/mês'
        },
        {
            id: 'hosting',
            name: 'Hospedagem gerida (VPS + SSL) — ano 2+',
            setup: 0,
            monthly: 0,
            annual: 800,
            label: 'R$ 800/ano',
            excludePlans: ['corporativo'],
            note: '1.º ano incluído no Corporativo'
        },
        {
            id: 'training',
            name: 'Treinamento extra (2 h)',
            setup: 450,
            monthly: 0,
            annual: 0,
            label: 'R$ 450 (único)'
        }
    ];

    var SCOPE = {
        base: [
            'Dashboard operacional — entradas do dia, pendências, receita do mês',
            'Agendamentos manuais (CRUD, filtros, cancelamento, status completo)',
            'Registro de <strong>entradas no pátio</strong> com cálculo automático de dias de antecipação',
            'Cobranças de antecipação — pendente, pago e isenção (gerente, com justificativa)',
            'Devoluções após liberação do caminhão',
            'Perfis operador, financeiro e gerente',
            'Configuração de valor/dia de antecipação e identidade (nome do sistema e empresa)'
        ],
        profissional: [
            'Integração com <strong>agendamento TBL</strong> — sincronização manual, teste de conexão, localidade IID',
            'Importação de fornecedor, cliente, transportador, NF, quantidade e janela de descarga',
            'Relatórios de cobranças e devoluções com <strong>exportação CSV</strong>',
            'Resumo financeiro com gráficos (Chart.js) por dia e por produto',
            'Homologação da integração no go-live'
        ],
        corporativo: [
            '<strong>10% de desconto automático</strong> na implantação e na mensalidade (ou licença anual)',
            'Hospedagem gerida (VPS + SSL) no 1.º ano',
            'Hardening de produção — HTTPS, backup documentado, checklist de go-live',
            'Pacote de evolução prioritária (cron TBL, multi-pátio, notificações) — escopo em aditivo',
            'SLA de suporte em 24 horas úteis; plantão em safra negociável'
        ]
    };

    var STORAGE_KEY = 'patio_comercial_proposta_v1';
    var CORPORATIVO_DISCOUNT_RATE = 0.1;

    function isCorporativo(planId) {
        return planId === 'corporativo';
    }

    function applyPlanDiscount(amount, planId) {
        if (!isCorporativo(planId)) return amount;
        return Math.round(amount * (1 - CORPORATIVO_DISCOUNT_RATE));
    }

    function planDiscountAmount(amount, planId) {
        if (!isCorporativo(planId)) return 0;
        return amount - applyPlanDiscount(amount, planId);
    }

    var DEFAULT_CLIENT = {
        proposalNumber: '',
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        city: ''
    };

    function digitsOnly(str) {
        return String(str || '').replace(/\D/g, '');
    }

    /** Telefone BR: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
    function maskPhone(value) {
        var d = digitsOnly(value).slice(0, 11);
        if (!d.length) return '';
        if (d.length <= 2) return '(' + d;
        if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
        if (d.length <= 10) {
            return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
        }
        return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7, 11);
    }

    /** CNPJ: 00.000.000/0001-00 */
    function maskCnpj(value) {
        var d = digitsOnly(value).slice(0, 14);
        if (!d.length) return '';
        if (d.length <= 2) return d;
        if (d.length <= 5) return d.slice(0, 2) + '.' + d.slice(2);
        if (d.length <= 8) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5);
        if (d.length <= 12) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8);
        return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12);
    }

    /** E-mail: minúsculas, sem espaços, só caracteres válidos */
    function maskEmail(value) {
        var v = String(value || '').toLowerCase().replace(/\s/g, '');
        v = v.replace(/[^a-z0-9._%+\-@]/g, '');
        var at = v.indexOf('@');
        if (at !== -1) {
            var local = v.slice(0, at).replace(/@/g, '');
            var domain = v.slice(at + 1).replace(/@/g, '');
            v = local + '@' + domain;
        }
        return v.slice(0, 200);
    }

    function isValidEmail(value) {
        var v = String(value || '').trim();
        if (!v) return true;
        return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(v);
    }

    function maskClientField(key, value) {
        if (key === 'phone') return maskPhone(value);
        if (key === 'document') return maskCnpj(value);
        if (key === 'email') return maskEmail(value);
        return value;
    }

    function money(n) {
        return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function moneyDec(n) {
        return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function usersLabel(plan) {
        if (plan.users >= 999) return plan.usersLabel || 'Ilimitados';
        return 'Até ' + plan.users;
    }

    function isAddonAvailable(addon, planId) {
        if (!planId) return true;
        return !(addon.excludePlans && addon.excludePlans.indexOf(planId) !== -1);
    }

    function normalizeClient(raw) {
        var client = {};
        Object.keys(DEFAULT_CLIENT).forEach(function (key) {
            var val = raw && raw[key] != null ? String(raw[key]).trim() : '';
            if (val && (key === 'phone' || key === 'document' || key === 'email')) {
                val = maskClientField(key, val);
            }
            client[key] = val.slice(0, 200);
        });
        return client;
    }

    function normalizeState(raw) {
        if (!raw || typeof raw !== 'object' || !raw.plan || !PLANS[raw.plan]) {
            return null;
        }
        var addons = {};
        if (Array.isArray(raw.addons)) {
            raw.addons.forEach(function (id) {
                if (typeof id === 'string') addons[id] = true;
            });
        } else if (raw.addons && typeof raw.addons === 'object') {
            Object.keys(raw.addons).forEach(function (id) {
                if (raw.addons[id]) addons[id] = true;
            });
        }
        return {
            plan: raw.plan,
            addons: addons,
            billing: raw.billing === 'annual' ? 'annual' : 'monthly',
            generatedAt: raw.generatedAt || new Date().toISOString().slice(0, 10),
            client: normalizeClient(raw.client)
        };
    }

    function selectedAddons(state) {
        return ADDONS.filter(function (a) {
            return state.addons[a.id] && isAddonAvailable(a, state.plan);
        });
    }

    function compute(state) {
        var normalized = normalizeState(state);
        if (!normalized) return null;

        var plan = PLANS[normalized.plan];
        var planId = normalized.plan;
        var addons = selectedAddons(normalized);
        var billing = normalized.billing;
        var lines = [];
        var initial = 0;
        var recurring = 0;
        var annualExtra = 0;
        var discountPlanTotal = 0;

        lines.push({ label: 'Plano ' + plan.name, value: '—', kind: 'plan' });

        if (billing === 'monthly') {
            var setupNet = applyPlanDiscount(plan.setup, planId);
            var monthlyNet = applyPlanDiscount(plan.monthly, planId);
            discountPlanTotal += planDiscountAmount(plan.setup, planId);

            initial += setupNet;
            recurring += monthlyNet;

            lines.push({
                label: 'Implantação do plano',
                value: isCorporativo(planId)
                    ? money(plan.setup) + ' → ' + money(setupNet)
                    : money(plan.setup),
                amount: setupNet,
                kind: 'setup'
            });
            lines.push({
                label: 'Mensalidade do plano',
                value: (isCorporativo(planId)
                    ? money(plan.monthly) + ' → ' + money(monthlyNet)
                    : money(plan.monthly)) + '/mês',
                amount: monthlyNet,
                kind: 'monthly'
            });
        } else {
            var annualNet = applyPlanDiscount(plan.annual, planId);
            discountPlanTotal += planDiscountAmount(plan.annual, planId);

            initial += annualNet;
            lines.push({
                label: 'Licença anual do plano (10 meses)',
                value: isCorporativo(planId)
                    ? money(plan.annual) + ' → ' + money(annualNet) + '/ano'
                    : money(plan.annual) + '/ano',
                amount: annualNet,
                kind: 'annual'
            });
        }

        if (isCorporativo(planId)) {
            if (billing === 'monthly') {
                discountPlanTotal += planDiscountAmount(plan.monthly, planId) * 12;
            }
            if (discountPlanTotal > 0) {
                lines.push({
                    label: 'Desconto Plano Corporativo (10%)',
                    value: '−' + money(discountPlanTotal) + (billing === 'monthly' ? ' (1.º ano)' : ''),
                    amount: -discountPlanTotal,
                    kind: 'discount'
                });
            }
        }

        addons.forEach(function (a) {
            if (a.setup > 0) {
                initial += a.setup;
                lines.push({
                    label: a.name,
                    value: money(a.setup) + (a.monthly > 0 ? ' + mensal' : ''),
                    amount: a.setup,
                    kind: 'addon-setup',
                    addonId: a.id
                });
            }
            if (a.monthly > 0) {
                recurring += a.monthly;
            }
            if (a.annual > 0) {
                annualExtra += a.annual;
                lines.push({ label: a.name, value: money(a.annual) + '/ano', amount: a.annual, kind: 'addon-annual', addonId: a.id });
            }
        });

        var year1 = initial + recurring * 12 + annualExtra;

        return {
            plan: plan,
            planId: normalized.plan,
            billing: billing,
            addons: addons,
            lines: lines,
            initial: initial,
            recurring: recurring,
            annualExtra: annualExtra,
            year1: year1,
            generatedAt: normalized.generatedAt,
            corporateDiscount: isCorporativo(planId),
            corporateDiscountRate: isCorporativo(planId) ? CORPORATIVO_DISCOUNT_RATE : 0,
            discountPlanTotal: discountPlanTotal
        };
    }

    function getScope(planId) {
        var items = SCOPE.base.slice();
        if (planId === 'profissional' || planId === 'corporativo') {
            items = items.concat(SCOPE.profissional);
        }
        if (planId === 'corporativo') {
            items = items.concat(SCOPE.corporativo);
        }
        var plan = PLANS[planId];
        items.push('<strong>' + usersLabel(plan) + ' utilizadores</strong> no sistema');
        return items;
    }

    function getImplementationRows(planId, addons) {
        var plan = PLANS[planId];
        var rows = [
            ['Ambiente', 'Servidor / hospedagem acordada, base MySQL, parametrização inicial'],
            ['Operação', 'Agendamentos, entradas no pátio e fluxo de cobrança por antecipação']
        ];
        if (planId !== 'essencial') {
            rows.push(['Integração TBL', 'Credenciais, localidade IID, sincronização e homologação']);
        }
        if (planId === 'corporativo') {
            rows.push(['Produção', 'HTTPS, backup documentado, remoção de artefatos de teste']);
            rows.push(['Hospedagem', 'VPS gerida + certificado SSL (1.º ano incluído)']);
        }
        addons.forEach(function (a) {
            if (a.id === 'cron_tbl') {
                rows.push(['Sync automático', 'Tarefa agendada (cron) para sincronização TBL']);
            }
            if (a.id === 'localidade') {
                rows.push(['Segunda localidade', 'Nova instância / pátio com integração TBL dedicada']);
            }
            if (a.id === 'pix') {
                rows.push(['Gateway PIX', 'Integração para pagamento de cobranças de antecipação']);
            }
            if (a.id === 'training') {
                rows.push(['Treinamento extra', 'Sessão adicional de <strong>2 horas</strong>']);
            }
        });
        rows.push(['Treinamento', '<strong>' + plan.trainingLabel + '</strong> (remoto ou presencial)']);
        rows.push(['Go-live', 'Acompanhamento no 1.º dia de operação com o sistema']);
        rows.push(['Suporte', '<strong>' + plan.support + '</strong> · SLA ' + plan.sla]);
        return rows;
    }

    function getUnselectedAddons(planId, selectedIds) {
        var selected = {};
        selectedIds.forEach(function (a) { selected[a.id] = true; });
        return ADDONS.filter(function (a) {
            return isAddonAvailable(a, planId) && !selected[a.id];
        });
    }

    function getLimitations(planId, addons) {
        var hasPix = addons.some(function (a) { return a.id === 'pix'; });
        var hasCron = planId === 'corporativo' || addons.some(function (a) { return a.id === 'cron_tbl'; });
        var parts = [
            'A tarifa R$/dia de antecipação configurada no sistema é a regra comercial do pátio (cobrada dos transportadores), não a mensalidade deste software.'
        ];
        if (!hasPix) {
            parts.push('Baixa de cobrança de antecipação é manual (sem gateway PIX), salvo add-on contratado.');
        } else {
            parts.push('Gateway PIX para cobranças de antecipação incluído nesta proposta.');
        }
        if (!hasCron) {
            parts.push('Sincronização TBL é manual pela interface; sync automático disponível como add-on ou no pacote Corporativo (aditivo).');
        } else if (planId !== 'corporativo') {
            parts.push('Sincronização TBL automática (cron) incluída via add-on.');
        }
        parts.push('Uma instalação padrão atende uma localidade TBL; múltiplos pátios exigem add-on ou projeto.');
        if (planId !== 'corporativo') {
            parts.push('Integração ERP/TMS, app mobile de portaria e WhatsApp automático não incluídos — sob projeto.');
        }
        return parts.join(' ');
    }

    function getObjetoExtra(planId) {
        if (planId === 'essencial') {
            return ' Foco em operação manual do pátio, sem integração com agendamento central TBL.';
        }
        if (planId === 'corporativo') {
            return ' Inclui 10% de desconto automático no plano, hospedagem gerida no 1.º ano, hardening de produção, SLA reforçado e pacote de evolução prioritária.';
        }
        return ' Inclui integração com agendamento TBL e relatórios gerenciais completos.';
    }

    function getTimelineRows(planId) {
        var plan = PLANS[planId];
        if (planId === 'essencial') {
            return (
                '<tr><td>Fase 1</td><td>Kick-off · ambiente · agendamentos e entradas · parametrização de cobrança</td><td>3–5 dias úteis</td></tr>' +
                '<tr><td>Fase 2</td><td>Treinamento (' + plan.trainingHours + ') · go-live · suporte ' + plan.support + '</td><td>2–5 dias úteis</td></tr>'
            );
        }
        if (planId === 'corporativo') {
            return (
                '<tr><td>Fase 1</td><td>Kick-off · ambiente · VPS/SSL · integração TBL</td><td>8–12 dias úteis</td></tr>' +
                '<tr><td>Fase 2</td><td>Relatórios · hardening · backup · testes integrados</td><td>8–15 dias úteis</td></tr>' +
                '<tr><td>Fase 3</td><td>Treinamento (' + plan.trainingHours + ') · go-live · suporte ' + plan.support + '</td><td>9–13 dias úteis</td></tr>'
            );
        }
        return (
            '<tr><td>Fase 1</td><td>Kick-off · ambiente · integração TBL · homologação</td><td>6–10 dias úteis</td></tr>' +
            '<tr><td>Fase 2</td><td>Relatórios · equipe financeira · testes ponta-a-ponta</td><td>4–6 dias úteis</td></tr>' +
            '<tr><td>Fase 3</td><td>Treinamento (' + plan.trainingHours + ') · go-live · suporte ' + plan.support + '</td><td>4–5 dias úteis</td></tr>'
        );
    }

    function getClientPremises() {
        return [
            'Fornecer credenciais TBL (quando aplicável) e política de valor/dia de antecipação em até 5 dias úteis após o sinal',
            'Indicar responsável operacional e gerencial para decisões e testes',
            'Garantir internet estável na portaria / escritório do pátio',
            'Designar equipe para treinamento nos horários acordados'
        ];
    }

    function saveState(state) {
        var normalized = normalizeState(state);
        if (!normalized) return false;
        try {
            var existing = loadState();
            var client = normalized.client;
            if (existing && existing.client && !hasClientData(normalized.client)) {
                client = existing.client;
            }
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                plan: normalized.plan,
                addons: Object.keys(normalized.addons),
                billing: normalized.billing,
                generatedAt: normalized.generatedAt || new Date().toISOString().slice(0, 10),
                client: client
            }));
            return true;
        } catch (e) {
            return false;
        }
    }

    function hasClientData(client) {
        if (!client) return false;
        return Object.keys(DEFAULT_CLIENT).some(function (key) {
            return !!client[key];
        });
    }

    function updateClient(state, patch) {
        if (!state) return null;
        var next = normalizeState(state);
        if (!next) return null;
        next.client = normalizeClient(Object.assign({}, next.client, patch || {}));
        saveState(next);
        return next;
    }

    function loadState() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed.client) parsed.client = {};
            return normalizeState(parsed);
        } catch (e) {
            return null;
        }
    }

    function formatDatePt(iso) {
        if (!iso) return '____________';
        var p = iso.split('-');
        if (p.length !== 3) return iso;
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    global.ComercialShared = {
        PLANS: PLANS,
        ADDONS: ADDONS,
        DEFAULT_CLIENT: DEFAULT_CLIENT,
        STORAGE_KEY: STORAGE_KEY,
        digitsOnly: digitsOnly,
        maskPhone: maskPhone,
        maskCnpj: maskCnpj,
        maskEmail: maskEmail,
        isValidEmail: isValidEmail,
        maskClientField: maskClientField,
        money: money,
        moneyDec: moneyDec,
        usersLabel: usersLabel,
        CORPORATIVO_DISCOUNT_RATE: CORPORATIVO_DISCOUNT_RATE,
        applyPlanDiscount: applyPlanDiscount,
        isCorporativo: isCorporativo,
        isAddonAvailable: isAddonAvailable,
        normalizeState: normalizeState,
        normalizeClient: normalizeClient,
        selectedAddons: selectedAddons,
        compute: compute,
        getScope: getScope,
        getImplementationRows: getImplementationRows,
        getUnselectedAddons: getUnselectedAddons,
        getLimitations: getLimitations,
        getObjetoExtra: getObjetoExtra,
        getTimelineRows: getTimelineRows,
        getClientPremises: getClientPremises,
        saveState: saveState,
        updateClient: updateClient,
        hasClientData: hasClientData,
        loadState: loadState,
        formatDatePt: formatDatePt
    };
})(typeof window !== 'undefined' ? window : this);
