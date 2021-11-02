package it.peluso.balance.model;

import lombok.*;

import java.util.Date;

@Getter
@Setter
@ToString
@EqualsAndHashCode
@Builder
@AllArgsConstructor
@NoArgsConstructor
public abstract class Transaction {

    protected Date transactionDate;
    protected int amount;
    protected TransactionCategory category;
    protected String description;
}
