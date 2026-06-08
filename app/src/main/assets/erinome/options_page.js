(function(worker) {
'use strict';

worker.getOptionsPage = function(base, isMobile, isTrader) {
	var eventInformers = ['full_godpower','much_gold','dead','low_health','fight','arena_available','dungeon_available','sail_available','datamine_available','selected_town','wanted_monster','special_monster','tamable_monster','chosen_monster','pet_knocked_out','close_to_boss','close_to_rival','guild_quest','mini_quest','custom_informers'],
		itemInformers = Object.keys(base.usable_items).filter(function(a) { return !!base.usable_items[a].title; }).map(function(a) { return a.replace(/\ /g,'_'); }),
		pageContent = '';

	var generateInformers = function(informers, inputClass, baseSect) {
		var result = '';
		inputClass = inputClass || '';
		for (var i = 0, len = informers.length; i < len; i++) {
			result +=
				'<input class="informer-checkbox ' + inputClass + '" title="' + worker.GUIp_i18n.informer_type_l + '" data-type="16" data-id="' + informers[i] + '" type="checkbox">' +
				'<input class="informer-checkbox ' + inputClass + '" title="' + worker.GUIp_i18n.informer_type_d + '" data-type="32" data-id="' + informers[i] + '" type="checkbox">' +
				'<input class="informer-checkbox ' + inputClass + '" title="' + worker.GUIp_i18n.informer_type_s + '" data-type="64" data-id="' + informers[i] + '" type="checkbox">' +
				(isTrader && inputClass === 'item-informer' ? '<input class="informer-checkbox ' + inputClass + '" title="' + worker.GUIp_i18n.informer_type_t + '" data-type="2048" data-id="' + informers[i] + '" type="checkbox">' : '') +
				(baseSect ? base[baseSect][informers[i].replace(/_/g,' ')].title : worker.GUIp_i18n['active_informers_' + informers[i]]) + '<br>\n';
		}
		return result;
	}
	if (!isMobile) {
		pageContent += '<p>\n' +
'<a href="/user/profile/settings">' + worker.GUIp_i18n.profile_menu_settings + '</a> | \n' +
'<a href="/user/profile/third_eye">' + worker.GUIp_i18n.profile_menu_third_eye + '</a> | \n' +
'<a href="/user/profile/apps">' + worker.GUIp_i18n.profile_menu_gadgets + '</a> | \n' +
'<a href="/user/profile/invites">' + worker.GUIp_i18n.profile_menu_invites + '</a> | \n' +
'<a href="/user/profile/plogs">' + worker.GUIp_i18n.profile_menu_plogs + '</a> | ' + worker.GUIp_i18n.ui_settings + '</p>\n' +
'<div id="pant_spn">\n' +
'	<img align="middle" alt="Spinner" border="0" id="spinner_prof" src="/images/spinner.gif" style="vertical-align: bottom; display: none; ">\n' +
'</div>\n';
	}
	pageContent += '<div id="central_block_my_page">\n' +
'	<div id="general_settings">\n' +
'		<div class="bl_cell">\n' +
'			<div class="bl_capt">' + worker.GUIp_i18n.ui_settings_capt + '</div>\n' +
'			<div id="add_general" class="bl_content">\n' +
'				<div class="new_line" style="margin-bottom: 0.8em;">\n' +
'					<label class="l_capt" for="disable_voice_generators">' + worker.GUIp_i18n.disable_voice_generators + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_voice_generators" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div style="clear: left; text-align: center;" id="voice_menu">\n' +
'					<div class="new_line">\n' +
'						<div class="l_capt">' + worker.GUIp_i18n.voicegen_settings + '</div>\n' +
'					</div>\n' +
'					<div class="new_line">\n' +
'						<div class="g_desc">\n' +
'							<input id="use_hero_name" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="use_hero_name">' + worker.GUIp_i18n.use_hero_name + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="use_exclamations" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="use_exclamations">' + worker.GUIp_i18n.use_exclamations + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="use_short_phrases" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="use_short_phrases">' + worker.GUIp_i18n.use_short_phrases + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="disable_die_button" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="disable_die_button">' + worker.GUIp_i18n.disable_die_button + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="relocate_craft_buttons" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="relocate_craft_buttons">' + worker.GUIp_i18n.relocate_craft_buttons + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="fixed_craft_buttons" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="fixed_craft_buttons">' + worker.GUIp_i18n.fixed_craft_buttons + '</label>\n' +
'						</div>\n' +
'						<div class="g_desc">\n' +
'							<input id="enable_custom_craft" class="option-checkbox ksmall" type="checkbox">\n' +
'							<label for="enable_custom_craft">' + worker.GUIp_i18n.enable_custom_craft + '</label>\n' +
'						</div>\n' +
'					</div>\n' +
'					<div class="new_line"><label class="l_capt" for="forbidden_craft">' + worker.GUIp_i18n.forbidden_craft + '</label>\n' +
'						<div class="field_content">\n' +
'							<input id="forbidden_craft" type="checkbox" class="menu-checkbox" data-option-type="cbgroup" data-option-inversed="true">\n' +
'						</div>\n' +
'					</div>\n' +
'					<div class="new_line">\n' +
'						<div class="g_desc">' + worker.GUIp_i18n.forbidden_craft_desc + '</div>\n' +
'						<div class="g_desc" id="forbidden_craft_choice">\n' +
'							<input class="craft-checkbox" id="b_b" type="checkbox" data-value-name="b_b" checked="checked"><label for="b_b">' + worker.GUIp_i18n.forbidden_craft_b_b + '</label><br>\n' +
'							<input class="craft-checkbox" id="b_r" type="checkbox" data-value-name="b_r" checked="checked"><label for="b_r">' + worker.GUIp_i18n.forbidden_craft_b_r + '</label><br>\n' +
'							<input class="craft-checkbox" id="r_r" type="checkbox" data-value-name="r_r" checked="checked"><label for="r_r">' + worker.GUIp_i18n.forbidden_craft_r_r + '</label><br>\n' +
'							<input class="craft-checkbox" id="usable" type="checkbox" data-value-name="usable" checked="checked"><label for="usable">' + worker.GUIp_i18n.forbidden_craft_usable + '</label><br>\n' +
'							<input class="craft-checkbox" id="heal" type="checkbox" data-value-name="heal" checked="checked"><label for="heal">' + worker.GUIp_i18n.forbidden_craft_heal + '</label><br>\n' +
'						</div>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="disable_logger">' + worker.GUIp_i18n.disable_logger + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_logger" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disable_logger_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="sum_allies_hp_h">\n' +
'					<label class="l_capt" for="sum_allies_hp">' + worker.GUIp_i18n.sum_allies_hp + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="sum_allies_hp" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="sum_allies_hp_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.sum_allies_hp_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="relocate_duel_buttons">' + worker.GUIp_i18n.relocate_duel_buttons + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="relocate_duel_buttons" class="menu-checkbox" data-option-type="cbgroup" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="relocate_duel_buttons_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.relocate_duel_buttons_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="relocate_duel_buttons_choice">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.relocate_duel_buttons_hint + '<br>\n' +
'						<input type="checkbox" id="relocate_arena" data-value-name="arena">\n' +
'						<label for="relocate_arena">' + worker.GUIp_i18n.relocate_duel_buttons_arena + '</label><br>\n' +
'						<input type="checkbox" id="relocate_chf" data-value-name="chf">\n' +
'						<label for="relocate_chf">' + worker.GUIp_i18n.relocate_duel_buttons_challenge + '</label><br>\n' +
'						<input type="checkbox" id="relocate_dun" data-value-name="dun">\n' +
'						<label for="relocate_dun">' + worker.GUIp_i18n.relocate_duel_buttons_dungeon + '</label><br>\n' +
'						<input type="checkbox" id="relocate_sail" data-value-name="sail">\n' +
'						<label for="relocate_sail">' + worker.GUIp_i18n.relocate_duel_buttons_sail + '</label><br>\n' +
'						<input type="checkbox" id="relocate_min" data-value-name="min">\n' +
'						<label for="relocate_min">' + worker.GUIp_i18n.relocate_duel_buttons_mining + '</label><br>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="forbidden_title_notices">' + worker.GUIp_i18n.forbidden_title_notices + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="forbidden_title_notices" class="menu-checkbox" data-option-type="cbgroup" data-option-inversed="true" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="forbidden_title_notices_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.forbidden_title_notices_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="forbidden_title_notices_choice">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.forbidden_title_notices_hint + '<br>\n' +
'						<input type="checkbox" id="title_notice_pm" checked="checked" data-value-name="pm">\n' +
'						<label for="title_notice_pm"><b>[1]</b> ' + worker.GUIp_i18n.forbidden_title_notices_pm + '</label><br>\n' +
'						<input type="checkbox" id="title_notice_gm" checked="checked" data-value-name="gm">\n' +
'						<label for="title_notice_gm"><b>[g]</b> ' + worker.GUIp_i18n.forbidden_title_notices_gm + '</label><br>\n' +
'						<input type="checkbox" id="title_notice_fi" checked="checked" data-value-name="fi">\n' +
'						<label for="title_notice_fi"><b>[f]</b> ' + worker.GUIp_i18n.forbidden_title_notices_fi + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line"><label class="l_capt" for="use_background">' + worker.GUIp_i18n.use_background + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="use_background" class="menu-checkbox" data-option-type="background" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="use_background_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.use_background_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="use_background_choice">\n' +
'					<div class="g_desc">\n' +
'						' + worker.GUIp_i18n.use_background_hint + '<br>\n' +
'						<input type="radio" name="background" id="cloud_background" value="cloud" checked="checked">\n' +
'						<label for="cloud_background">' + worker.GUIp_i18n.use_background_cloud + '</label><br>\n' +
'						<input type="radio" name="background" id="custom_background" value="custom">\n' +
'						<label for="custom_background">' + worker.GUIp_i18n.use_background_file + '</label>\n' +
'						<input type="file" id="custom_file" style="width: 212px;"/><br>\n' +
'						<label for="custom_background" style="margin: 0 0.3em 0 2.4em">' + worker.GUIp_i18n.use_background_link + ' </label>\n' +
'						<input type="text" id="custom_link" style="width: 116px;"/>\n' +
'						<button class="e_emoji e_emoji_shortcut eguip_font">⏎</button>\n' +
'						<span id="cb_status" style="margin-left: 0.5em; display: none;"></span>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line"><label class="l_capt" for="voice_timeout">' + worker.GUIp_i18n.voice_timeout + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="voice_timeout" class="menu-checkbox" data-option-type="number" data-default-value="20" data-min-value="1" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="voice_timeout_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.voice_timeout_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="voice_timeout_choice">\n' +
'					<div class="g_desc">\n' +
'						<label for="voice_timeout_value">' + worker.GUIp_i18n.voice_timeout_hint + '</label>\n' +
'						<input type="number" id="voice_timeout_value" style="width: 116px;"/>\n' +
'						<button class="e_emoji e_emoji_shortcut eguip_font">⏎</button>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="improve_discharge_button">' + worker.GUIp_i18n.improve_discharge_button + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="improve_discharge_button" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.improve_discharge_button_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="hide_charge_button">' + worker.GUIp_i18n.hide_charge_button + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="hide_charge_button" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.hide_charge_button_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="hide_charge_button">' + worker.GUIp_i18n.hide_bless_button + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="hide_bless_button" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.hide_bless_button_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="confirm_influences">' + worker.GUIp_i18n.confirm_influences + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="confirm_influences" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.confirm_influences_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="l_capt">' + worker.GUIp_i18n.dungeon_settings + '</div>\n' +
'					<div class="field_content" style="display: none;">\n' +
'						<input id="dungeon_map_settings" class="menu-checkbox" data-option-type="dungeon-cbgroup" type="checkbox" checked>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="dungeon_map_settings_cbs">\n' +
'					<div class="g_desc">\n' +
'						<input id="dmap_dimensions" class="checkbox ksmall" type="checkbox" data-value-name="dims">\n' +
'						<label for="dmap_dimensions">' + worker.GUIp_i18n.dmap_dimensions + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="dmap_save_marks" class="checkbox ksmall" type="checkbox" data-value-name="excl">\n' +
'						<label for="dmap_save_marks">' + worker.GUIp_i18n.dmap_save_marks + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="dmap_put_dm_link" class="checkbox ksmall" type="checkbox" data-value-name="dmln">\n' +
'						<label for="dmap_put_dm_link">' + worker.GUIp_i18n.dmap_put_dm_link + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="l_capt">' + worker.GUIp_i18n.islands_map_settings + '</div>\n' +
'					<div class="field_content" style="display: none;">\n' +
'						<input id="islands_map_settings" class="menu-checkbox" data-option-type="islands-cbgroup" type="checkbox" checked>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="islands_map_settings_cbs">\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_widen" class="checkbox ksmall" type="checkbox" data-value-name="widen">\n' +
'						<label for="islands_map_widen">' + worker.GUIp_i18n.islands_map_widen + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_showcrd" class="checkbox ksmall" type="checkbox" data-value-name="tcrd">\n' +
'						<label for="islands_map_showcrd">' + worker.GUIp_i18n.islands_map_showcrd + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_rndcolors" class="checkbox ksmall" type="checkbox" data-value-name="rndc">\n' +
'						<label for="islands_map_rndcolors">' + worker.GUIp_i18n.islands_map_rndcolors + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_dhh" class="checkbox ksmall" type="checkbox" data-value-name="dhh">\n' +
'						<label for="islands_map_dhh">' + worker.GUIp_i18n.islands_map_dhh + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_dth" class="checkbox ksmall" type="checkbox" data-value-name="dth">\n' +
'						<label for="islands_map_dth">' + worker.GUIp_i18n.islands_map_dth + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_conv" class="checkbox ksmall" type="checkbox" data-value-name="conv">\n' +
'						<label for="islands_map_conv">' + worker.GUIp_i18n.islands_map_conv + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_pdpm" class="checkbox ksmall" type="checkbox" data-value-name="pdpm">\n' +
'						<label for="islands_map_pdpm">' + worker.GUIp_i18n.islands_map_pdpm + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_arknum" class="checkbox ksmall" type="checkbox" data-value-name="arknum">\n' +
'						<label for="islands_map_arknum">' + worker.GUIp_i18n.islands_map_arknum + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_beastieshp" class="checkbox ksmall" type="checkbox" data-value-name="bhp">\n' +
'						<label for="islands_map_beastieshp">' + worker.GUIp_i18n.islands_map_beastieshp + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_arkdir" class="checkbox ksmall" type="checkbox" data-value-name="arkdir">\n' +
'						<label for="islands_map_arkdir">' + worker.GUIp_i18n.islands_map_arkdir + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_monochrome" class="checkbox ksmall" type="checkbox" data-value-name="mch">\n' +
'						<label for="islands_map_monochrome">' + worker.GUIp_i18n.islands_map_monochrome + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_hide_inforing" class="checkbox ksmall" type="checkbox" data-value-name="hrng">\n' +
'						<label for="islands_map_hide_inforing">' + worker.GUIp_i18n.islands_map_hide_inforing + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="islands_map_dlh" class="checkbox ksmall" type="checkbox" data-value-name="dlh">\n' +
'						<label for="islands_map_dlh">' + worker.GUIp_i18n.islands_map_dlh + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc" style="margin-top: 1em;">\n' +
'						' + worker.GUIp_i18n.islands_map_hints_style + '<br />\n' +
'						<input type="radio" name="islands_map_hints" id="islands_map_hints_tile_marking" value="tile_marking" />\n' +
'						<label for="islands_map_hints_tile_marking">' + worker.GUIp_i18n.islands_map_hints_tile_marking + '</label><br />\n' +
'						<input type="radio" name="islands_map_hints" id="islands_map_hints_tile_marking_old" value="tile_marking_old" />\n' +
'						<label for="islands_map_hints_tile_marking_old">' + worker.GUIp_i18n.islands_map_hints_tile_marking_old + '</label><br />\n' +
'						<input type="radio" name="islands_map_hints" id="islands_map_hints_polylinear" value="polylinear" />\n' +
'						<label for="islands_map_hints_polylinear">' + worker.GUIp_i18n.islands_map_hints_polylinear + '</label><br />\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="l_capt">' + worker.GUIp_i18n.range_map_settings + '</div>\n' +
'					<div class="field_content" style="display: none;">\n' +
'						<input id="range_map_settings" class="menu-checkbox" data-option-type="range-cbgroup" type="checkbox" checked>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="range_map_settings_cbs">\n' +
'					<div class="g_desc">\n' +
'						<input id="rmap_boss_alpha" class="checkbox ksmall" type="checkbox" data-value-name="balph">\n' +
'						<label for="rmap_boss_alpha">' + worker.GUIp_i18n.rmap_boss_alpha + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="rmap_grid" class="checkbox ksmall" type="checkbox" data-value-name="grid">\n' +
'						<label for="rmap_grid">' + worker.GUIp_i18n.rmap_grid + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt">' + worker.GUIp_i18n.ally_blacklist + '</label>\n' +
'					<div class="field_content"></div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.ally_blacklist_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="freeze_voice_button">' + worker.GUIp_i18n.freeze_voice_button + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="freeze_voice_button" class="menu-checkbox" data-option-type="cbgroup" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc" id="freeze_voice_button_desc">' + worker.GUIp_i18n.freeze_voice_button_desc + '</div>\n' +
'					<div class="g_desc" id="freeze_voice_button_choice">\n' +
'						<input type="checkbox" id="freeze_after_voice" data-value-name="after_voice">\n' +
'						<label for="freeze_after_voice">' + worker.GUIp_i18n.freeze_voice_button_after_voice + '</label><br>\n' +
'						<input type="checkbox" id="freeze_when_empty" data-value-name="when_empty">\n' +
'						<label for="freeze_when_empty">' + worker.GUIp_i18n.freeze_voice_button_when_empty + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="disable_page_refresh">' + worker.GUIp_i18n.disable_page_refresh + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_page_refresh" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disable_page_refresh_desc + '</div>\n' +
'				</div>\n' +

'				<div class="new_line">\n' +
'					<label class="l_capt" for="disabled_timers">' + worker.GUIp_i18n.disabled_timers + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disabled_timers" class="menu-checkbox" data-option-type="cbgroup" data-option-inversed="true" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="disabled_timers_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disabled_timers_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="disabled_timers_choice">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disabled_timers_hint + '<br>\n' +
'						<input type="checkbox" id="disabled_timers_conversion" checked="checked" data-value-name="conversion">\n' +
'						<label for="disabled_timers_conversion"><b>(%)</b> ' + worker.GUIp_i18n.disabled_timers_conversion + '</label><br>\n' +
'						<input type="checkbox" id="disabled_timers_dungeon" checked="checked" data-value-name="dungeon">\n' +
'						<label for="disabled_timers_dungeon"><b>(@)</b> ' + worker.GUIp_i18n.disabled_timers_dungeon + '</label><br>\n' +
'						<input type="checkbox" id="disabled_timers_mining" checked="checked" data-value-name="mining">\n' +
'						<label for="disabled_timers_mining"><b>(+)</b> ' + worker.GUIp_i18n.disabled_timers_mining + '</label><br>\n' +
'						<input type="checkbox" id="disabled_timers_souls" checked="checked" data-value-name="souls">\n' +
'						<label for="disabled_timers_mining"><b>(☥)</b> ' + worker.GUIp_i18n.disabled_timers_souls + '</label>\n' +
'					</div>\n' +
'				</div>\n';
pageContent +=
'				<div class="new_line"><div class="l_capt">' + worker.GUIp_i18n.active_informers + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.active_informers_desc + '</div>\n' +
'					<div class="g_desc" id="informers">\n' +
		generateInformers(eventInformers) +
'						<div style="margin-top: 0.75em;">' + worker.GUIp_i18n.active_informers_usable_items + '</div>\n' +
		generateInformers(itemInformers, 'item-informer', 'usable_items') +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="l_capt">' + worker.GUIp_i18n.enable_desktop_alerts + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">\n' +
'						<input id="enable_informer_alerts" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="enable_informer_alerts">' + worker.GUIp_i18n.enable_informer_alerts + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="enable_pm_alerts" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="enable_pm_alerts">' + worker.GUIp_i18n.enable_pm_alerts + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line"><label class="l_capt" for="informer_custom_sound">' + worker.GUIp_i18n.informer_custom_sound + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="informer_custom_sound" class="menu-checkbox" data-option-type="infosound" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="informer_custom_sound_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.informer_custom_sound_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="informer_custom_sound_choice">\n' +
'					<div class="g_desc">\n' +
'						' + worker.GUIp_i18n.use_background_hint + '<br>\n' +
'						<input type="radio" name="infosound" id="infosound_arena" value="arena" checked="checked">\n' +
'						<label for="infosound_arena">' + worker.GUIp_i18n.informer_custom_sound_arena + '</label><br>\n' +
'						<input type="radio" name="infosound" id="infosound_spar" value="spar">\n' +
'						<label for="infosound_spar">' + worker.GUIp_i18n.informer_custom_sound_spar + '</label><br>\n' +
'						<input type="radio" name="infosound" id="infosound_msg" value="msg">\n' +
'						<label for="infosound_msg">' + worker.GUIp_i18n.informer_custom_sound_msg + '</label><br>\n' +
'						<input type="radio" name="infosound" id="infosound_custom" value="file">\n' +
'						<label for="infosound_custom">' + worker.GUIp_i18n.informer_custom_sound_file + '</label>\n' +
'						<input type="file" id="infosound_file" style="width: 212px;"/><br>\n' +
'						<input type="radio" name="infosound" id="infosound_custom_lnk">\n' +
'						<label for="infosound_custom_lnk">' + worker.GUIp_i18n.informer_custom_sound_lnk + '</label>\n' +
'						<input type="text" id="infosound_lnk" style="width: 162px;"/><br>\n' +
'						<label for="infosound_volume">' + worker.GUIp_i18n.informer_custom_sound_volume + '</label>\n' +
'						<input type="range" id="infosound_volume" min="0" max="100" value="100" /><br>\n' +
'						<button style="margin: 0.25em 0 0 1.5em">' + worker.GUIp_i18n.informer_custom_sound_play + '</button>\n' +
'						<span id="infosound_status" style="margin-left: 0.5em; display: none;"></span>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line"><label class="l_capt" for="forum_informer_custom_sound">' + worker.GUIp_i18n.forum_informer_custom_sound + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="forum_informer_custom_sound" class="menu-checkbox" data-option-type="forumsound" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="forum_informer_custom_sound_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.forum_informer_custom_sound_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="forum_informer_custom_sound_choice">\n' +
'					<div class="g_desc">\n' +
'						' + worker.GUIp_i18n.use_background_hint + '<br>\n' +
'						<input type="radio" name="forumsound" id="forumsound_arena" value="arena">\n' +
'						<label for="forumsound_arena">' + worker.GUIp_i18n.informer_custom_sound_arena + '</label><br>\n' +
'						<input type="radio" name="forumsound" id="forumsound_spar" value="spar">\n' +
'						<label for="forumsound_spar">' + worker.GUIp_i18n.informer_custom_sound_spar + '</label><br>\n' +
'						<input type="radio" name="forumsound" id="forumsound_msg" value="msg" checked="checked">\n' +
'						<label for="forumsound_msg">' + worker.GUIp_i18n.informer_custom_sound_msg + '</label><br>\n' +
'						<input type="radio" name="forumsound" id="forumsound_custom" value="file">\n' +
'						<label for="forumsound_custom">' + worker.GUIp_i18n.informer_custom_sound_file + '</label>\n' +
'						<input type="file" id="forumsound_file" style="width: 212px;"/><br>\n' +
'						<input type="radio" name="forumsound" id="forumsound_custom_lnk">\n' +
'						<label for="forumsound_custom_lnk">' + worker.GUIp_i18n.informer_custom_sound_lnk + '</label>\n' +
'						<input type="text" id="forumsound_lnk" style="width: 162px;"/><br>\n' +
'						<label for="infosound_volume">' + worker.GUIp_i18n.informer_custom_sound_volume + '</label>\n' +
'						<input type="range" id="forumsound_volume" min="0" max="100" value="100" /><br>\n' +
'						<button style="margin: 0.25em 0 0 1.5em">' + worker.GUIp_i18n.informer_custom_sound_play + '</button>\n' +
'						<span id="forumsound_status" style="margin-left: 0.5em; display: none;"></span>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="informer_alerts_timeout_h"><label class="l_capt" for="informer_alerts_timeout">' + worker.GUIp_i18n.informer_alerts_timeout + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="informer_alerts_timeout" class="menu-checkbox" data-option-type="number" data-default-value="5" data-min-value="0" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="informer_alerts_timeout_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.informer_alerts_timeout_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="informer_alerts_timeout_choice">\n' +
'					<div class="g_desc">\n' +
'						<label for="informer_alerts_timeout_value">' + worker.GUIp_i18n.informer_alerts_timeout_hint + '</label>\n' +
'						<input type="number" id="informer_alerts_timeout_value" min="0" max="600" style="width: 116px;"/>\n' +
'						<button class="e_emoji e_emoji_shortcut eguip_font">⏎</button>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="disable_links_autoreplace">' + worker.GUIp_i18n.disable_links_autoreplace + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_links_autoreplace" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disable_links_autoreplace_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="disable_target_post_highlight">' + worker.GUIp_i18n.disable_target_post_highlight + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_target_post_highlight" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disable_target_post_highlight_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="disable_godville_clock">' + worker.GUIp_i18n.disable_godville_clock + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="disable_godville_clock" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.disable_godville_clock_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="localtime_godville_clock_h">\n' +
'					<label class="l_capt" for="localtime_godville_clock">' + worker.GUIp_i18n.localtime_godville_clock + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="localtime_godville_clock" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line" id="localtime_godville_clock_desc">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.localtime_godville_clock_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="theme_override">' + worker.GUIp_i18n.theme_override + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="theme_override" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.theme_override_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="enable_pm_sounds">' + worker.GUIp_i18n.pm_sounds + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="enable_pm_sounds" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.pm_sounds_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="l_capt">' + worker.GUIp_i18n.fix_native_issues + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">\n' +
'						<input id="enable_glowfix" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="enable_glowfix">' + worker.GUIp_i18n.enable_glowfix + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="te_pos_fix" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="te_pos_fix">' + worker.GUIp_i18n.te_pos_fix + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="improve_town_abbrs" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="improve_town_abbrs">' + worker.GUIp_i18n.improve_town_abbrs + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="enable_chrome_chatfix" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="enable_chrome_chatfix">' + worker.GUIp_i18n.enable_chrome_chatfix + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="discard_title_changes" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="discard_title_changes">' + worker.GUIp_i18n.discard_title_changes + '</label>\n' +
'					</div>\n' +
'					<div class="g_desc">\n' +
'						<input id="relocate_pets_button" class="option-checkbox ksmall" type="checkbox">\n' +
'						<label for="relocate_pets_button">' + worker.GUIp_i18n.relocate_pets_button + '</label>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<label class="l_capt" for="enable_debug_mode">' + worker.GUIp_i18n.enable_debug_mode + '</label>\n' +
'					<div class="field_content">\n' +
'						<input id="enable_debug_mode" class="option-checkbox" type="checkbox">\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div class="g_desc">' + worker.GUIp_i18n.enable_debug_mode_desc + '</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<div id="options_saved"></div>\n' +
'				</div>\n' +
'			</div>\n' +
'		</div>\n' +
'	</div>\n';
	pageContent +=
'	<div id="words" style="margin-top: 2em;">\n' +
'		<div class="bl_cell">\n' +
'			<div class="bl_capt">' + worker.GUIp_i18n.voices_capt + '</div>\n' +
'			<div class="bl_content">\n' +
'				<a id="l_heal">' + worker.GUIp_i18n.voices_heal + '</a>\n' +
'				<a id="l_heal_field">' + worker.GUIp_i18n.voices_heal_field + '</a>\n' +
'				<a id="l_pray">' + worker.GUIp_i18n.voices_pray + '</a>\n' +
'				<a id="l_pray_field">' + worker.GUIp_i18n.voices_pray_field + '</a>\n' +
'				<a id="l_sacrifice">' + worker.GUIp_i18n.voices_sacrifice + '</a>\n' +
'				<a id="l_exp" href="#">' + worker.GUIp_i18n.voices_exp + '</a>\n' +
'				<a id="l_dig" href="#">' + worker.GUIp_i18n.voices_dig + '</a>\n' +
'				<a id="l_hit" href="#">' + worker.GUIp_i18n.voices_hit + '</a>\n' +
'				<a id="l_hit_field" href="#">' + worker.GUIp_i18n.voices_hit_field + '</a>\n' +
'				<a id="l_do_task">' + worker.GUIp_i18n.voices_do_task + '</a>\n' +
'				<a id="l_cancel_task">' + worker.GUIp_i18n.voices_cancel_task + '</a>\n' +
'				<a id="l_die" href="#">' + worker.GUIp_i18n.voices_die + '</a>\n' +
'				<a id="l_town" href="#">' + worker.GUIp_i18n.voices_town + '</a>\n' +
'				<a id="l_defend" href="#">' + worker.GUIp_i18n.voices_defend + '</a>\n' +
'				<a id="l_exclamation" href="#">' + worker.GUIp_i18n.voices_exclamation + '</a>\n' +
'				<a id="l_inspect_prefix" href="#">' + worker.GUIp_i18n.voices_inspect_prefix + '</a>\n' +
'				<a id="l_craft_prefix" href="#">' + worker.GUIp_i18n.voices_craft_prefix + '</a>\n' +
'				<a id="l_go_north" href="#">' + worker.GUIp_i18n.voices_north + '</a>\n' +
'				<a id="l_go_south" href="#">' + worker.GUIp_i18n.voices_south + '</a>\n' +
'				<a id="l_go_west" href="#">' + worker.GUIp_i18n.voices_west + '</a>\n' +
'				<a id="l_go_east" href="#">' + worker.GUIp_i18n.voices_east + '</a>\n' +
'				<a id="l_go_downstairs" href="#">' + worker.GUIp_i18n.voices_downstairs + '</a>\n' +
'				<a id="l_go_upstairs" href="#">' + worker.GUIp_i18n.voices_upstairs + '</a>\n' +
'				<a id="l_mnemonics" href="#">' + worker.GUIp_i18n.voices_mnemonics + '</a>\n' +
'				<div id="opt_change_words">\n' +
'					<div class="new_line">\n' +
'						<textarea id="ta_edit" class="rounded_field" rows="1" style="width: 98%; resize: horizontal; white-space: '+(worker.GUIp_browser === 'Firefox' ? 'pre' : 'nowrap')+';" disabled></textarea>\n' +
'					</div>\n' +
'				</div>\n' +
'				<div class="new_line">\n' +
'					<input id="save_words" class="input_btn" type="submit" value="' + worker.GUIp_i18n.voices_save + '" disabled>\n' +
'					<input id="set_default" class="input_btn" type="button" value="' + worker.GUIp_i18n.voices_defaults + '" disabled>\n' +
'				</div>\n' +
'			</div>\n' +
'		</div>\n' +
'	</div>\n' +
'	<div style="margin: 2em 0;">\n' +
'		<div class="bl_cell">\n' +
'			<div class="bl_capt">' + worker.GUIp_i18n.user_css + '</div>\n' +
'			<div class="bl_content" style="text-align: center; padding-top: 0.9em;">\n' +
'				<div class="new_line">\n' +
'					<textarea id="user_css" class="rounded_field" spellcheck="false" style="width: 98%; resize: horizontal; white-space: '+(worker.GUIp_browser === 'Firefox' ? 'pre' : 'nowrap')+';"></textarea>\n' +
'				</div>\n' +
'				<input id="save_user_css" class="input_btn" type="submit" value="' + worker.GUIp_i18n.apply + '" disabled>\n' +
'			</div>\n' +
'		</div>\n' +
'	</div>\n' +
'	<div style="margin: 2em 0;">\n' +
'		<div class="bl_cell">\n' +
'			<div class="bl_capt">' + worker.GUIp_i18n.import_export_capt + '</div>\n' +
'			<div class="bl_content" style="text-align: center; padding-top: 0.9em;">\n' +
'				<div class="new_line">\n' +
'					<textarea id="guip_settings" class="rounded_field" rows="1" spellcheck="false" style="width: 98%;"></textarea>\n' +
'				</div>\n' +
'				<input id="settings_import" class="input_btn" type="submit" value="' + worker.GUIp_i18n.import + '">\n' +
'				<input id="settings_export" class="input_btn" type="submit" value="' + worker.GUIp_i18n.export + '">\n' +
'				<input id="settings_download" class="input_btn" type="submit" value="' + worker.GUIp_i18n.settings_cloud_download + '">\n' +
'				<input id="settings_upload" class="input_btn" type="submit" value="' + worker.GUIp_i18n.settings_cloud_upload + '">\n' +
'				<br><label><input id="settings_everything" type="checkbox">' + worker.GUIp_i18n.import_export_all + '</label>\n' +
'			</div>\n' +
'		</div>\n' +
'	</div>\n' +
'</div>';
	return pageContent;
};

})(this);
