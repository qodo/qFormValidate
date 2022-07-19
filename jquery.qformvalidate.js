var $ = jQuery;
(function ($, window, document) {
    "use strict";
    $.fn.qFormValidate = function ($options) {
        return this.each(function () {

            // Make sure we only do this once by adding a class
            if ($(this).hasClass('qFormValidateWatch')) return;
            $(this).addClass('qFormValidateWatch');

            // Variables
            var $form = $(this),
                $errors = [],
                $fields = $form.find('input,select,textarea'),
                $defaultErrorMsg = 'Please complete this field.',
                $defaultErrorMsgSection = 'Please complete this section.';

            // Default options
            var $defaults = {
                'scrollTopOffset': 100, // How much to adjust scroll to by
                'onSubmitError': function() {},
                'onError': function() {},
                'onAfterValidate': function() {},
                'onBeforeValidate': function() {},
                'onSuccess': function() {},
                'popup': true,      // Should we show a popup
                'colorbox': true,   // Should we show a colorbox popup or alert
                'Tipped': true      // Should we show Tipped tooltips on fields
            };

            // Merge defaults with user options            
            $options = $.extend($defaults, $options);

            // When the form is submitted, we should validate
            $form.attr('novalidate', 'novalidate').submit(validateForm);

            $form.on('clearErrors', function() {
                clearErrors();
            });

            // Add a watcher to the fields
            $fields.each(function() {
                watchField($(this));
            });

            function trim(s) {
                s = s.replace(/(^\s*)|(\s*$)/gi,"");
                s = s.replace(/[ ]{2,}/gi," ");
                s = s.replace(/\n /,"\n");
                return s;
            }

            //------------------------------------------------------------------
            // Function to validate an email address
            function isValidEmail(email) {
                var RegExp = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
                return RegExp.test(email);
            }

            //------------------------------------------------------------------
            // Basic function to check password strength
            function checkStrength(e) {

                // Initial
                var strength = 0

                // Get password value
                var p = e.val();
                var m = e.next('.password-strength');

                // Remove classes from message
                m.removeClass('good weak strong');

                //if the password length is less than 6, return message.
                if (p.length < 6) {
                    m.addClass('short');
                    m.text('Too short');
                    return;
                }

                // If length is 8 characters or more, increase strength value
                if (p.length > 7) strength += 1;

                // If password contains both lower and uppercase characters, increase strength value
                if (p.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength += 1;

                // If it has numbers and characters, increase strength value
                if (p.match(/([a-zA-Z])/) && p.match(/([0-9])/)) strength += 1;

                // If it has one special character, increase strength value
                if (p.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1;

                // If it has two special characters, increase strength value
                if (p.match(/(.*[!,%,&,@,#,$,^,*,?,_,~].*[!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1;

                // If value is less than 2
                if (strength < 2 ) {
                    m.addClass('weak')
                    m.text('Weak');
                } else if (strength == 2 ) {
                    m.addClass('good');
                    m.text('Good');
                } else {
                    m.addClass('strong');
                    m.text('Strong');
                }
            }

            // Character restrictions for on keypress
            var dateOnly = /[0-9\/\-\.]/g; // Date characters only
            var digitsOnly = /[0-9]/g; // Integers only
            var integerOnly = /[0-9\.,]/g; // Floats only
            var alphaOnly = /[a-z]/gi; // Alpha only
            var alphaNumericOnly = /[a-z0-9]/gi; // Alphanumeric only
            var urlOnly = /[a-z0-9\.\-:\/\?=&#]/gi; // URL only characters
            var emailOnly = /[a-z0-9@_\-\+\.]/gi; // Email only characters
            var telOnly = /[0-9 /(/)+]/gi; // Telephone only characters

            //------------------------------------------------------------------
            // Restrict what characters they can input
            function restrictCharacters($field, e, restrictionType) {

                // TODO: Pasting, select all, copy
                if (!e) var e = window.event
                var code = (e.keyCode) ? e.keyCode : e.which ;
                var character = String.fromCharCode(code);
                var ignoreKeys = [
                    'ArrowRight',
                    'ArrowLeft',
                    'ArrowUp',
                    'ArrowDown',
                    'Backspace',
                    'Delete',
                    'Tab',
                    'Insert',
                    'Home',
                    'End',
                    'PageUp',
                    'PageDown'
                ];

                // Some debug information
                // console.log(code + " > " + e.key + " > " + character + "\n" + character.match(restrictionType));

                // Ignore the usual keys (Some things to consider altKey, ctrlKey, metaKey or shiftKey)
                if ((e.key && $.inArray(e.key, ignoreKeys) != -1) || e.ctrlKey) return true;

                // if they pressed esc... remove focus from field...
                if (code == 27 || e.key == 'Escape') { $field.blur(); return false; }

                if (character.match(restrictionType)) {
                    return true;
                } else {
                    return false;
                }

            }

            //------------------------------------------------------------------
            // Watch a field to validate changes - we create tooltips
            function watchField($field) {

                var $form = $field.get(0).form;
                var $name = $field.attr('name');
                var $class = $field.attr('class');
                var $pattern = $field.attr('pattern');
                var $type = $field.attr('type');
                var $tag = $field.prop('tagName').toLowerCase();
                var $required  = ($field.prop('required') == true);

                // Here clear errors on other forms when a field is focussed
                $field.focus(function() {
                    $("form.qFormValidate").not($form).trigger('clearErrors');
                });

                // If this is a text area, add maxlength as there should be a limit
                // if ($tag == 'textarea' || ($tag == 'input' && $type != 'number') && $field.not(':disabled') && $field.not('[readonly]')) {
                //     $field.maxlength({
                //          text: '%length/%maxlength'
                //     });
                // }

                // Password strength indicator
                if ($tag == 'input' && $type == 'password' && $field.hasClass('password-strength')) {
                    $field.after('<div class="password-strength"></div>');
                }

                // Restrict characters to telOnly
                if ($type == 'tel') {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, telOnly);
                    });
                }

                // Restrict characters to emailOnly
                if ($type == 'email') {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, emailOnly);
                    });
                }

                // Restrict characters to dateOnly
                if ($type == 'date' || $field.hasClass('date')) {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, dateOnly);
                    });
                }

                // Restrict characters to urlOnly
                if ($type == 'url') {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, urlOnly);
                    });
                    $field.blur(function() {
                        var regEx = /(http|https):\/\//i;
                        if ($(this).val() != '' && !regEx.test($(this).val())) {
                            $(this).val("http://" + $(this).val());
                        }
                    });
                }

                // Restrict characters to integerOnly
                if ($field.is('.number, .price, .quantity, .amount, .qty') || $type == 'number') {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, integerOnly);
                    });
                }

                // Restrict characters to alphaNumericOnly
                if ($field.hasClass('alphanumeric')) {
                    $field.keypress(function(e) {
                        return restrictCharacters($(this), e, alphaNumericOnly);
                    });
                }

                // If the field has it's own pattern attr, use this
                // if (typeof $pattern != "undefined") {
                //     alert("Using pattern: " + $pattern);
                //     $field.keypress(function(e) {
                //         return restrictCharacters($(this), e, new RegExp($pattern, 'i'));
                //     });
                // }

                // Trim any unnecessary spaces on blur
                if ($type == 'text' || $type == 'url' || $type == 'email' || $type == 'tel' || $type == 'search' || $tag == 'textarea') {
                    $field.blur(function() {
                        $(this).val(trim($(this).val()));
                    });
                }

                // If data-error-msg is not set, try the title attr otherwise default to default error message
                if ($field.data('error-msg') === undefined) {
                    if ($field.attr('title') !== undefined) { // Use title
                        $field.data('error-msg', $field.attr('title'));
                    } else {
                        if ($.inArray($type, ["radio","select","checkbox"]) != -1) {
                            $field.data('error-msg', $defaultErrorMsgSection);
                        } else {
                            $field.data('error-msg', $defaultErrorMsg);
                        }
                    }
                }

                // Where to position depending on tag type or screen size
                var $pos = ($type == "checkbox" || $tag == "button" || $tag == "form" || screen.width < 640) ? 'topleft' : 'right' ;

                // Create the tooltip
                // Tipped.create($field, '<em class="icon-warning-sign icon-large pull-left"></em>' + $errorMsg + '', {
                //  skin : 'red',
                //  hideOn: false,
                //  showOn: false,
                //  close: true, // Allow them to close the tooltip
                //  position: $pos,
                //  offset: { x: 1, y: 2 },
                //  containment: false,
                //  zIndex: 5000 // 5000 colorbox uses similar
                // });

                // What kind of element dictates what bind action
                var bind = ($type == "checkbox" || $tag == "select" || $tag == "form") ? 'change blur' : 'blur keyup' ;

                // Using the above bind action, watch the form element
                $field.bind(bind, function($event) {
                    validateField($field, $event);
                });

            };

            //------------------------------------------------------------------
            // Adds an error to the list and creates tooltip
            function addError($field) {

                var $name = $field.attr('name');

                // Get the error message for this field
                var $errorMsg = $field.data('error-msg');

                // Here we check to see if colorbox is display, if so we change the z-index
                if ($field.parents('#cboxLoadedContent').length > 0) {
                    // $('#colorbox, #cboxOverlay, #cboxWrapper').css('z-index', '4999');
                }

                // Add error class to the field and parent li or p
                $field.addClass('error');
                $field.closest('div, li, p').addClass('error').find('span.inline-error').remove();
                $field.attr({
                    'aria-invalid' : 'true',
                    'aria-describedby' : $name + '_error'
                });
                $field.after('<span class="inline-error" id="' + $name + '_error" aria-hidden="false" role="alert">' + $errorMsg + '</span>');

                // Add error to the list
                $errors.push($errorMsg);

                $options.onError();

            };
            //------------------------------------------------------------------
            // Validates the form field
            function validateField($field, $event) {

                var $name = $field.attr('name'),
                    $class = $field.attr('class'),
                    $type = $field.attr('type'),
                    $tag = $field.prop('tagName').toLowerCase(),
                    $val = $field.val(),
                    $required  = ($field.prop('required') == true);

                // Is it empty?
                if ($required && $val == "") {
                    addError($field);
                    return true;
                }
                // Does it have some custom validation?
                if ($field.data('validate')) {
                    $msg = window[$field.data('validate')]($field);
                    if ($msg) {
                        addError($field, $msg);
                        return true;
                    }
                }
                // Should it be the same as another field?
                if ($field.data('same-as')) {
                    if ($('#' + $field.data('same-as')).val() != $val) {
                        addError($field);
                        return true;
                    }
                }
                // Is it an email address
                if ($type == 'email' && $val!= '' && !isValidEmail($val)) {
                    addError($field);
                    return true;
                }
                // Is it an URL
                if ($type == 'url' && $val !='' && !isValidURL($val)) {
                    addError($field);
                    return true;
                }
                // Is it a password
                if ($type == 'password') {
                    checkStrength($field);
                }
                if ($type == 'password' && $val.length < 6) {
                    addError($field);
                    return true;
                }
                // Is it a required checkbox check something is selected
                if ($required && ($type == 'checkbox' || $type == 'radio')) {
                    if ($('input[name=' + $name + ']:checked').length == 0) {
                        addError($field);
                        return true;
                    } else {
                        $('input[name=' + $name + ']').each(function(index, el) {
                            removeFieldError($(this));
                        });
                    }
                }
                // Is it alphabetical only
                if ($field.hasClass('alpha') && !/[a-zA-Z]/.test($val)) {
                    addError($field);
                    return true;
                }
                // Is it alpha numeric only
                if ($field.hasClass('alphanumeric') && !/[a-zA-Z0-9]/.test($val)) {
                    addError($field);
                    return true;
                }

                $options.onAfterValidate();

                // No errors, clear any visual messages
                removeFieldError($field);
            }

            //------------------------------------------------------------------
            // Remove an error from a form field
            function removeFieldError($field) {
                // There are no errors, remove classes and tooltips
                $field.removeClass('error').closest('div, li, p').removeClass('error').find('span.inline-error').remove();
                $field.attr('aria-invalid', 'false').removeAttr('aria-describedby');
            }

            //------------------------------------------------------------------
            // Validates the form based on attributes
            function validateForm() {

                // Clear errors before starting
                clearErrors();

                // For each element, check the
                $fields.each(function() {
                    $options.onBeforeValidate();
                    validateField($(this));
                    $options.onAfterValidate();
                });

                // If there are errors, stop form from submitting and show the messages
                if ($errors.length > 0) {

                    // If viewing a colorbox form change behaviour
                    if ($form.parents('#cboxLoadedContent').length > 0) {
                        // We could do something here....
                    } else {
                        //alert($errors);
                        // alert($errors.join("\n"));
                        $('html,body').animate({
                            scrollTop: $('.error:first').offset().top - $options.scrollTopOffset
                        }, 1000, function() { $('.error:first').addClass('shake')  });
                    }

                    // Call onSubmitError
                    $options.onSubmitError();
                    return false;

                } else {
                    // Call onSuccess
                    $options.onSuccess();
                }

                // Should this show a loading message?
                if ($form.hasClass('formLoadingMsg')) {
                    // showColorBoxLoading($form.data('target') ? $form.data('loadingmsg') : '<strong>Loading</strong><br/>Please wait.' );
                }

                // Otherwise we are happy with this and disable fields
                setTimeout(function() {
                    // Timeout as it needs a small delay
                    $form.find('a.button, button, input[type=submit], input[type=reset]').each(function(i, e) {
                        $(this).css({ 'width' : $(this).outerWidth(), 'height' : $(this).outerHeight() }).html('<span class="loader"></span>');
                    });
                }, 10);

            };

            // Removes all error styles and tooltips
            function clearErrors() {
                $errors = [];
                $fields.each(function() {
                    removeFieldError($(this));
                });
            };
        });
    };
})(jQuery, window, document);
