# Desafio FullStack

## Objetivo

Desenvolver uma aplicação para realizar a gestão de hóspedes em um hotel.

Deverá permitir a ***realização de reservas***, ***check-in***, ***checkout***. A aplicação deverá conter login.

## Requisitos funcionais

- Armazenar de forma persistente o cadastro de hóspedes (Informações mínimas: Nome, documento, telefone);
- Armazenar de forma persistente as reservas geradas;
- Deve ser possível localizar hóspedes por: nome, documento e telefone;
- Localizar hóspedes que ainda estão no hotel;
- Localizar hóspedes que tem reservas, mas ainda não realizaram o check-in;
- Permitir ao atendente realizar o check-in;
- Permitir ao atendente realizar o checkout;

## Regras de negócio

- Diárias de segunda à sexta-feira terão um valor fixo de R$ 120,00;
- Diárias em finais de semana terão um valor fixo de R$ 180,00;
- Caso o hóspede tenha carro e necessite utilizar as vagas disponíveis no estabelecimento, será cobrado uma taxa adicional de R$ 15,00 de segunda à sexta-feira e R$ 20,00 nos finais de semana;
- O horário para a realização do check-in será a partir das 14h00min. Ao tentar realizar o procedimento antes do horário previsto, o sistema deverá emitir um alerta;
- O horário para a realização do checkout será até as 12h00min. Caso o procedimento seja realizado posteriormente, deverá ser cobrada uma taxa adicional de 50% do valor da diária (Respeitando a variação para dias úteis e finais de semana);
- Durante o processo de checkout, deverá ser exibido em detalhes o total geral da reserva a ser paga;

## Requisitos técnicos

- Python, Django e PostgreSQL para backend e React para frontend.  
  Demais frameworks e/ou recursos podem ser adicionados, desde que julgue adequado para a solução do problema;

---

**IMPORTANTE:** ***<u>É imprescindível a apresentação dos testes unitários tanto no Frontend, quanto no Backend para validar os requisitos funcionais e regras de negócio.</u>***

Procedimentos de como configurar o ambiente de execução dos projetos devem ser descritos no README.md de seu projeto.

<u>Criar repositório em um repositório <b>GIT</b> com acesso público e nos encaminhar o link para avaliação.</u>
