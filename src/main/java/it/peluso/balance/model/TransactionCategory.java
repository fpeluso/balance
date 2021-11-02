package it.peluso.balance.model;

import lombok.Getter;

@Getter
public enum TransactionCategory {

    SUPERMARKET("supermarket"),
    HOME_CARE("home_care"),
    BILL("bill"),
    MOB_PHONE("mob_phone"),
    CAR("car"),
    STREAMING("streaming"),
    BABY("baby"),
    HOUSE("house"),
    MORTGAGE("mortgage"),
    MONTHLY_DEBT("monthly_debt"),
    PENSION_SAVING("pension_savings"),
    INVESTMENT("investments"),
    MEAL("meal")
    ;

    private final String type; //TODO: why this as to be final?

    private TransactionCategory(String type) {
        this.type = type;
    }


}
